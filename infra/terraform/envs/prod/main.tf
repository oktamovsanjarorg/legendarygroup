# Legendary Group — production (T-012, 06 §2). Region: eu-central-1 (Frankfurt).
#   tofu init  (backend — bootstrap'dagi bucket)  →  tofu plan  →  tofu apply
# Sirlar bu yerda YO'Q: SSM Parameter Store'ga operator yozadi (state'ga tushmaydi).
terraform {
  required_version = ">= 1.10"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 6.0" }
  }
  backend "s3" {
    bucket       = "lg-tfstate-237004325959"
    key          = "prod/terraform.tfstate"
    region       = "eu-central-1"
    encrypt      = true
    use_lockfile = true
  }
}

provider "aws" {
  region = var.region
  default_tags {
    tags = { Project = "legendary-group", Environment = "prod", ManagedBy = "opentofu" }
  }
}

data "aws_caller_identity" "me" {}
data "aws_availability_zones" "az" { state = "available" }

locals {
  name    = "lg-prod"
  account = data.aws_caller_identity.me.account_id
  azs     = slice(data.aws_availability_zones.az.names, 0, 2)
}
