# KMS: EBS, RDS, S3, SSM SecureString uchun bitta mijoz kaliti (06 §6).
resource "aws_kms_key" "main" {
  description             = "${local.name} ma'lumotlarini shifrlash"
  enable_key_rotation     = true
  deletion_window_in_days = 30
}

resource "aws_kms_alias" "main" {
  name          = "alias/${local.name}"
  target_key_id = aws_kms_key.main.key_id
}

# ---------- Fayllar (o'quvchi rasmlari, cheklar): private, faqat presigned URL ----------
resource "aws_s3_bucket" "files" {
  bucket = "${local.name}-files-${local.account}"
}

resource "aws_s3_bucket_versioning" "files" {
  bucket = aws_s3_bucket.files.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "files" {
  bucket = aws_s3_bucket.files.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.main.arn
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "files" {
  bucket                  = aws_s3_bucket.files.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Brauzer presigned POST bilan to'g'ridan-to'g'ri yuklaydi (T-019).
resource "aws_s3_bucket_cors_configuration" "files" {
  bucket = aws_s3_bucket.files.id
  cors_rule {
    allowed_methods = ["GET", "POST", "PUT"]
    allowed_origins = ["https://${var.app_domain}"]
    allowed_headers = ["*"]
    max_age_seconds = 3600
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "files" {
  bucket = aws_s3_bucket.files.id
  rule {
    id     = "cleanup"
    status = "Enabled"
    filter {}
    noncurrent_version_expiration { noncurrent_days = 90 }
    abort_incomplete_multipart_upload { days_after_initiation = 7 }
  }
}

# ---------- Backup'lar (T-015): Object Lock COMPLIANCE — admin ham o'chira olmaydi ----------
resource "aws_s3_bucket" "backups" {
  bucket              = "${local.name}-backups-${local.account}"
  object_lock_enabled = true
}

resource "aws_s3_bucket_versioning" "backups" {
  bucket = aws_s3_bucket.backups.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_object_lock_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id
  rule {
    default_retention {
      mode = "COMPLIANCE"
      days = 35
    }
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.main.arn
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "backups" {
  bucket                  = aws_s3_bucket.backups.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# 06 §5: kunlik — 35 kun, keyin Glacier (1 yilgacha); oylik — Deep Archive (1 yil).
resource "aws_s3_bucket_lifecycle_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id
  rule {
    id     = "daily"
    status = "Enabled"
    filter { prefix = "db/daily/" }
    transition {
      days          = 35
      storage_class = "GLACIER"
    }
    expiration { days = 365 }
    noncurrent_version_expiration { noncurrent_days = 1 }
  }
  rule {
    id     = "monthly"
    status = "Enabled"
    filter { prefix = "db/monthly/" }
    transition {
      days          = 1
      storage_class = "DEEP_ARCHIVE"
    }
    expiration { days = 400 }
    noncurrent_version_expiration { noncurrent_days = 1 }
  }
}

# ---------- ECR: image'lar (tag o'zgarmas, push'da skan, oxirgi 30 tasi) ----------
resource "aws_ecr_repository" "app" {
  for_each             = toset(["lg-api", "lg-worker", "lg-bot", "lg-web"])
  name                 = each.key
  image_tag_mutability = "IMMUTABLE"
  image_scanning_configuration { scan_on_push = true }
  encryption_configuration {
    encryption_type = "KMS"
    kms_key         = aws_kms_key.main.arn
  }
}

resource "aws_ecr_lifecycle_policy" "app" {
  for_each   = aws_ecr_repository.app
  repository = each.value.name
  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Oxirgi 30 ta image"
      selection    = { tagStatus = "any", countType = "imageCountMoreThan", countNumber = 30 }
      action       = { type = "expire" }
    }]
  })
}
