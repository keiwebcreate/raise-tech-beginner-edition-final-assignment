# Terraform と、AWS を操作する部品（プロバイダー）の設定

terraform {
  required_version = ">= 1.14"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
    # ばらばらの文字列を作る部品（DB のパスワード）
    random = {
      source  = "hashicorp/random"
      version = "~> 3.7"
    }
  }

  # state（何を作ったかの記録）は、このフォルダの terraform.tfstate に置く。
  # 中身の細かい情報が入るので Git には入れない（.gitignore）
}

provider "aws" {
  region = var.region

  # 作るものすべてに付ける札。コンソールや請求で、このアプリのものと見分けられる
  default_tags {
    tags = {
      Project   = var.project_name
      ManagedBy = "terraform"
    }
  }
}
