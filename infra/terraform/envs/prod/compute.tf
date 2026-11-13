# Ilova serveri: Graviton (arm64), Amazon Linux 2023, Docker Compose (06 §2). IMDSv2 majburiy
# (hop 2 — konteynerdagi SDK instance rolidan foydalanadi), EBS shifrlangan, SSH kaliti yo'q.
data "aws_ssm_parameter" "al2023_arm64" {
  name = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-arm64"
}

resource "aws_instance" "app" {
  ami                    = data.aws_ssm_parameter.al2023_arm64.value
  instance_type          = var.instance_type
  subnet_id              = aws_subnet.public[0].id
  vpc_security_group_ids = [aws_security_group.app.id]
  iam_instance_profile   = aws_iam_instance_profile.app.name
  user_data              = file("${path.module}/user-data.sh")
  monitoring             = false

  metadata_options {
    http_tokens                 = "required"
    http_put_response_hop_limit = 2
  }

  root_block_device {
    volume_type = "gp3"
    volume_size = 40
    encrypted   = true
    kms_key_id  = aws_kms_key.main.arn
  }

  # Yangi AMI chiqqanda server qayta yaratilmasin — OS yangilanishi serverning o'zida (dnf).
  lifecycle {
    ignore_changes = [ami, user_data]
  }

  tags = { Name = local.name }
}

resource "aws_eip" "app" {
  domain   = "vpc"
  instance = aws_instance.app.id
  tags     = { Name = local.name }
}

# Server o'chsa yoki holat tekshiruvi yiqilsa — AWS avtomatik tiklaydi (bir xil IP, disk).
resource "aws_cloudwatch_metric_alarm" "recover" {
  alarm_name          = "${local.name}-auto-recover"
  namespace           = "AWS/EC2"
  metric_name         = "StatusCheckFailed_System"
  statistic           = "Maximum"
  period              = 60
  evaluation_periods  = 2
  threshold           = 1
  comparison_operator = "GreaterThanOrEqualToThreshold"
  dimensions          = { InstanceId = aws_instance.app.id }
  alarm_actions       = ["arn:aws:automate:${var.region}:ec2:recover"]
}
