# Event service

A lightweight server designed for ingesting error data from Kafka, processing the raw data, including:

1. Cleaning noise from error stacks to ensure clarity and readability.
2. Mapping the code block where the error occurred, utilizing the source map stored in the S3 bucket.
3. Generate unique fingerprints based on the error type and its position

## Event streaming workflow

![event process](https://github.com/Chen-Yuan-Lai/FalconEye/assets/108986288/90b0f1ea-3592-48db-925f-b8158e34d274)
