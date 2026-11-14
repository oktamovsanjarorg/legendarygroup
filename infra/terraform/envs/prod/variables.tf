variable "region" {
  type    = string
  default = "eu-central-1"
}

variable "app_domain" {
  description = "Ilova domeni (masalan app.legendarygroup.uz) — S3 CORS uchun. DNS yozuvini egasi qo'yadi."
  type        = string
}

variable "github_repo" {
  description = "Deploy roli faqat shu repodan (OIDC): owner/repo"
  type        = string
  default     = "oktamovsanjarorg/legendarygroup"
}

variable "instance_type" {
  type    = string
  default = "t4g.medium"
}

variable "db_instance_class" {
  type    = string
  default = "db.t4g.small"
}

variable "db_engine_version" {
  description = "PostgreSQL major (RDS shu major'ning standart minor'ini tanlaydi, minor avto-yangilanadi)"
  type        = string
  default     = "18"
}

variable "budget_monthly_usd" {
  description = "Oylik byudjet ogohlantirishi; null — o'rnatilmaydi"
  type        = number
  default     = null
}

variable "budget_email" {
  type    = string
  default = null
}
