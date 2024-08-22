---
title: Generating JSONs with LLMs - Beyond Basics
description: Advanced techniques for improving speed, accuracy and cost of JSON generation with LLMs.
publishDate: "22 August 2024"
tags: ["llm", "ai", "json"]
draft: true
---

Turning unstructured data into structured data is one of the core use cases for AI. In the OpenAI APIs world, the three most popular methods are:

- **JSON mode** - Instructing an LLM to output JSON. Instructions regarding the shape of the JSON must included in the prompt. This is also available in [Mistral models](https://docs.mistral.ai/capabilities/json_mode/).
- **Tool calling** - Instructing an LLM to call a tool that follows a certain JSONSchema. This functionality is also available in Anthropic's Claude models family.
- **Structured Outputs** - Evolution of JSON Mode with strict schema adherance.

You can learn more about their strengths and weaknesses in my [previous blogpost about benchmarking Strict Mode](/posts/benchmarking-llms-for-structured-json-generation/).

# Increasing Accuracy

### Enriching the Schema

- Provide `descriptions` for each field
- Provide `reasoning` for fields that require computing, reasoning, decision making or computing a value based on other fields.
- Not all JSONSchema are supported by the strict mode! Solution to this is: create as detailed schema as possible. Pass dumbed down version of the schema with only supported properties to the LLM. Validate the output against the full schema using e.g. Zod. Get the validation errors and pass them to the LLM along with the output and ask it to fix the errors.

### Sequence of fields

- Experiment with sequence of fields. Try to put them in as logical order as possible. For instance, when extracting data from invoice, bad order can be something like "signed_by, invoice number, total, due date, etc.". If you were a human reading this invoice in that order, you would be very confused. LLM will have exactly the same trouble.

### Multipass mode & election

OpenAI's API supports the `n` parameter, which allows for generating multiple completions in one request. This can be used to generate multiple JSONs in a single request and pay for the input just once (you will still be billed a multiple of `n` for the output tokens).

# Increasing Speed

# Reducing Costs
