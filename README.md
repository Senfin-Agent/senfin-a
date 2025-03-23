# Senfin-A Synthetic Data Marketplace

Senfin-A is a web application that transforms real data into synthetic data while keeping personal details hidden. The project uses Nillion SecretLLM to process and generate synthetic data in a secure environment. The resulting synthetic dataset, along with the AI's chain of thought logs, is stored in Recall—a blockchain based storage system—in a single agent index bucket. Authorized users can later search, view, and purchase access to these synthetic datasets and review the accompanying logs for auditing and decision-making.

## Overview

Senfin-A offers a straightforward process for generating synthetic data. A user uploads a JSON file with private data. The system then sends this data to Nillion SecretLLM, which analyzes and creates a synthetic version that maintains the important statistical patterns without exposing any personal information. Both the synthetic output and the AI's chain of thought (CoT) logs are stored on Recall. Only the keys or references to these files are recorded on a smart contract, which controls access. This ensures that synthetic data remains secure, verifiable, and easily accessible to authorized users while preserving privacy.

## Technologies

Senfin-A is built using:

- **Nillion SecretLLM** – Provides a secure environment to generate synthetic data without exposing the raw input.
- **Recall Network** – A blockchain based storage system that safely stores synthetic data and chain of thought logs in a single agent index bucket.
- **Node.js & Express** – Power the backend agent that orchestrates the data generation and storage process.
- **React** – Offers a user-friendly front-end for data generation, retrieval, and marketplace browsing.
- **Viem** – Used for blockchain interactions.
- **Other Utilities** – Including environment variable management with .env files and file handling libraries.


