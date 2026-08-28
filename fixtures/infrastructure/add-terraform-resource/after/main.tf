terraform {
  required_version = ">= 1.5"
}

resource "aws_s3_bucket" "uploads" {
  bucket = "my-uploads"
}
