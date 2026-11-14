# RDS PostgreSQL (06 §2): shifrlangan, PITR 14 kun, deletion protection, faqat ilova serveridan.
# Master parol — RDS boshqaradi (Secrets Manager); ilova login'i (lg_api) — alohida, cheklangan.
resource "aws_db_subnet_group" "main" {
  name       = local.name
  subnet_ids = aws_subnet.private[*].id
}

resource "aws_db_parameter_group" "main" {
  name   = "${local.name}-pg${var.db_engine_version}"
  family = "postgres${var.db_engine_version}"

  parameter {
    name  = "rds.force_ssl"
    value = "1"
  }
  parameter {
    name  = "timezone"
    value = "UTC"
  }
  parameter {
    name  = "log_min_duration_statement"
    value = "500"
  }

  lifecycle { create_before_destroy = true }
}

resource "aws_db_instance" "main" {
  identifier     = local.name
  engine         = "postgres"
  engine_version = var.db_engine_version
  instance_class = var.db_instance_class

  db_name                     = "legendary"
  username                    = "lg_owner"
  manage_master_user_password = true

  allocated_storage     = 20
  max_allocated_storage = 100
  storage_type          = "gp3"
  storage_encrypted     = true
  kms_key_id            = aws_kms_key.main.arn

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.db.id]
  parameter_group_name   = aws_db_parameter_group.main.name
  publicly_accessible    = false
  multi_az               = false

  backup_retention_period    = 14
  backup_window              = "21:00-22:00" # 02:00–03:00 Toshkent
  maintenance_window         = "sun:22:30-sun:23:30"
  auto_minor_version_upgrade = true
  copy_tags_to_snapshot      = true
  deletion_protection        = true
  skip_final_snapshot        = false
  final_snapshot_identifier  = "${local.name}-final"

  performance_insights_enabled = true
}
