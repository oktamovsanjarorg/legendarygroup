output "server_ip" {
  description = "DNS A yozuvi: <app_domain> → shu IP"
  value       = aws_eip.app.public_ip
}

output "instance_id" {
  value = aws_instance.app.id
}

output "ecr_registry" {
  value = "${local.account}.dkr.ecr.${var.region}.amazonaws.com"
}

output "db_endpoint" {
  value = aws_db_instance.main.address
}

output "db_owner_secret_arn" {
  value = aws_db_instance.main.master_user_secret[0].secret_arn
}

output "files_bucket" {
  value = aws_s3_bucket.files.bucket
}

output "backups_bucket" {
  value = aws_s3_bucket.backups.bucket
}

output "deploy_role_arn" {
  description = "GitHub Actions (environment: production) — AWS_DEPLOY_ROLE_ARN"
  value       = aws_iam_role.deploy.arn
}
