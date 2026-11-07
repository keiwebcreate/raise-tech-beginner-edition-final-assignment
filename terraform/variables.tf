variable "region" {
  description = "作る場所。組織の制限でシドニーしか使えない"
  type        = string
  default     = "ap-southeast-2"

  validation {
    condition     = var.region == "ap-southeast-2"
    error_message = "リージョンはシドニー（ap-southeast-2）にする。東京などは組織の制限で拒否される。"
  }
}

variable "project_name" {
  description = "名前と札に付けるアプリの名前"
  type        = string
  default     = "recipe-app"
}

variable "instance_type" {
  description = "EC2 の大きさ（AWS 構成設計書 5.2）"
  type        = string
  default     = "t4g.small"
}

variable "db_instance_class" {
  description = "RDS の大きさ（AWS 構成設計書 5.3）"
  type        = string
  default     = "db.t4g.micro"
}

variable "db_name" {
  description = "最初に作る DB の名前。開発と同じ"
  type        = string
  default     = "recipe_app"
}

variable "db_username" {
  description = "DB のユーザー名。開発と同じ"
  type        = string
  default     = "recipe_app_user"
}
