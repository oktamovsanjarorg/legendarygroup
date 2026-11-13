# CloudTrail (06 §6): boshqaruv amallari jurnali — kim nima yaratdi/o'chirdi. Fayllar 1 yil.
resource "aws_s3_bucket" "trail" {
  bucket        = "${local.name}-trail-${local.account}"
  force_destroy = false
}

resource "aws_s3_bucket_public_access_block" "trail" {
  bucket                  = aws_s3_bucket.trail.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "trail" {
  bucket = aws_s3_bucket.trail.id
  rule {
    id     = "retention"
    status = "Enabled"
    filter {}
    expiration { days = 365 }
  }
}

data "aws_iam_policy_document" "trail" {
  statement {
    actions   = ["s3:GetBucketAcl"]
    resources = [aws_s3_bucket.trail.arn]
    principals {
      type        = "Service"
      identifiers = ["cloudtrail.amazonaws.com"]
    }
  }
  statement {
    actions   = ["s3:PutObject"]
    resources = ["${aws_s3_bucket.trail.arn}/AWSLogs/${local.account}/*"]
    principals {
      type        = "Service"
      identifiers = ["cloudtrail.amazonaws.com"]
    }
    condition {
      test     = "StringEquals"
      variable = "s3:x-amz-acl"
      values   = ["bucket-owner-full-control"]
    }
  }
}

resource "aws_s3_bucket_policy" "trail" {
  bucket = aws_s3_bucket.trail.id
  policy = data.aws_iam_policy_document.trail.json
}

resource "aws_cloudtrail" "main" {
  name                       = local.name
  s3_bucket_name             = aws_s3_bucket.trail.id
  is_multi_region_trail      = false
  enable_log_file_validation = true
  depends_on                 = [aws_s3_bucket_policy.trail]
}

# Byudjet ogohlantirishi — ixtiyoriy (budget_monthly_usd berilsa).
resource "aws_budgets_budget" "monthly" {
  count        = var.budget_monthly_usd == null ? 0 : 1
  name         = "${local.name}-monthly"
  budget_type  = "COST"
  limit_amount = tostring(var.budget_monthly_usd)
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [var.budget_email]
  }
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = [var.budget_email]
  }
}
