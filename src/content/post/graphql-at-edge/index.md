---
title: GraphQL@Edge with global DynamoDB, AWS Lambda and Cloudfront
description: How to use GraphQL@Edge to serve a globally replicated DynamoDB table
tags: ["aws", "dynamodb", "graphql"]
publishDate: "29 May 2020"
image: https://servicefull.cloud/static/23834a52d9f9306278d544d872fe7d40/17fa4/overview.png
coverImage:
  src: "./overview.png"
  alt: "Astro build wallpaper"
---

I'm seeing an interesting juxtaposition lately. While many people claim we're observing a [downfall of the software quality and speed](https://tonsky.me/blog/disenchantment/), it is also a well-known fact that optimizing your website speed is crucial for your business' success. Just a second of delay [affects user engagement](https://blog.pusher.com/how-latency-affects-user-engagement/) and lowers your business KPIs significantly. There's a big contrast between what's delivered and what's expected.

We are trying to bridge this gap by ~~throwing money~~ using solutions like [Vercel](https://vercel.com/), [Netlify](https://netlify.com/) or [CloudFlare](https://cloudflare.com/), which deploys our websites to the globally available CDNs to fix the latency problem, but oftentimes speed of these websites is limited by the slowness of related APIs or specifically, how far our requests have to travel through the internet to reach the public endpoint. Paradigms like [JAMStack](https://jamstack.org/), which try to eliminate the need to interact with APIs, are definitely step in the right direction. However, they are not a remedy. Some use cases just [won't fit that model](https://medium.com/front-end-weekly/the-issues-with-jamstack-you-might-need-a-backend-d101791de36a), you might still need a classical backend.

I wanted to explore that problem and see if I can reduce the latency between the end-user and API by deploying a Serverless GraphQL _"server"_ to the each of the [CloudFront CDN edge locations](https://aws.amazon.com/cloudfront/features/) using [Lambda@Edge](https://aws.amazon.com/lambda/edge/) and make that work with [globally replicated DynamoDB](https://dynobase.dev/dynamodb-global-tables/) table.

Here's how I imagined it:

![GraphQL@Edge infrastructure](./overview.png "Overview")

Essentially, each user around the globe instead of hitting that one central endpoint in `us-east-1` would be routed to the one of the closest GraphQL _"servers"_ and that _"server"_ would fetch the data from closest globally replicated DynamoDB table using the optimized route.

Since I'm not a big fan of AWS Console, [just like many people](https://news.ycombinator.com/item?id=20901800), I decided to make use of AWS' new way of provisioning infrastructure, the [Cloud Development Kit (CDK)](https://aws.amazon.com/cdk/).

With CDK, provisioning something which might seem complicated like this example, can actually be done with _less than 100 lines of code_. Here's the complete infrastructure code proof of concept explained step by step:

<br/>

<CodeWave>

```ts
export class GraphQLAtEdge extends cdk.Stack {
	constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
		super(scope, id, props);

		const table = new Table(this, "globdynamodb", {
			partitionKey: { name: "hashKey", type: AttributeType.STRING },
			replicationRegions,
		});
	}
}
```

First, we provision a [DynamoDB]((https://dynobase.dev/dynamodb/) table with `replicationRegions` parameter. This creates a multi-master NoSQL database with replicas located in desired regions. For the sake of example, I will be using table with simple `string` partition key called just `hashKey`.

```ts
export class GraphQLAtEdge extends cdk.Stack {
	constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
		super(scope, id, props);

		const table = new Table(this, "globdynamodb", {
			partitionKey: { name: "hashKey", type: AttributeType.STRING },
			replicationRegions,
		});

		const bucket = new Bucket(this, "bucket", {
			publicReadAccess: true,
			websiteIndexDocument: "playground.html",
		});
	}
}
```

Then, provision an , which will be an origin for CloudFront distribution and will host [GraphQL Playground](https://github.com/prisma-labs/graphql-playground), a web-IDE which makes interaction with GraphQL APIs much easier.

```jsx
export class GraphQLAtEdge extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const table = new Table(this, 'globdynamodb', {
      partitionKey: { name: 'hashKey', type: AttributeType.STRING },
      replicationRegions,
    });

    const bucket = new Bucket(this, 'bucket', {
      publicReadAccess: true,
      websiteIndexDocument: 'playground.html',
    });

    const graphql = new NodejsFunction(this, 'lambda', {
      entry: './src/graphql-server/dist/function.js',
      handler: 'handler',
      memorySize: 128, // Max
      minify: true, // To fit below 1MB code limit
      timeout: Duration.millis(5000), // Max
      role: new Role(this, 'AllowLambdaServiceToAssumeRole', {
        assumedBy: new CompositePrincipal(
          new ServicePrincipal('lambda.amazonaws.com'),
          new ServicePrincipal('edgelambda.amazonaws.com')
        ),
        managedPolicies: [
          ManagedPolicy.fromManagedPolicyArn(
            this,
            'gql-server-managed-policy',
            'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'
          ),
        ],
      }),
    });
  }
}
```

Next, add a Serverless function with [maximum limits](https://twitter.com/AwsTricks/status/1261950071760916486) for a Lambda@Edge with `VIEWER_REQUEST` type. Code for this Lambda will be stored inside [/src/graphql-server/](https://github.com/RafalWilinski/edge-graphql-dynamodb-api/tree/master/src/graphql-server) directory. We also attach a [standard managed IAM policy](https://docs.aws.amazon.com/lambda/latest/dg/lambda-intro-execution-role.html) which allows uploading logs to CloudWatch.

```jsx 16
export class GraphQLAtEdge extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const table = new Table(this, 'globdynamodb', {
      partitionKey: { name: 'hashKey', type: AttributeType.STRING },
      replicationRegions,
    });

    const bucket = new Bucket(this, 'bucket', {
      publicReadAccess: true,
      websiteIndexDocument: 'playground.html',
    });

    const graphql = new NodejsFunction(this, 'lambda', {
      entry: './src/graphql-server/dist/function.js',
      handler: 'handler',
      memorySize: 128, // Max
      minify: true, // To fit below 1MB code limit
      timeout: Duration.millis(5000), // Max
      role: new Role(this, 'AllowLambdaServiceToAssumeRole', {
        assumedBy: new CompositePrincipal(
          new ServicePrincipal('lambda.amazonaws.com'),
          new ServicePrincipal('edgelambda.amazonaws.com')
        ),
        managedPolicies: [
          ManagedPolicy.fromManagedPolicyArn(
            this,
            'gql-server-managed-policy',
            'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'
          ),
        ],
      }),
    });
  }
}
```

One weird thing that you may notice here is that I'm using `dist/function.js` as the `entry` parameter of the function. This is because when I'm writing this, there's a [bug in `NodejsFunction` construct](https://github.com/aws/aws-cdk/issues/8031) which packages dependencies incorrectly.

```jsx
export class GraphQLAtEdge extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const table = new Table(this, 'globdynamodb', {
      partitionKey: { name: 'hashKey', type: AttributeType.STRING },
      replicationRegions,
    });

    const bucket = new Bucket(this, 'bucket', {
      publicReadAccess: true,
      websiteIndexDocument: 'playground.html',
    });

    const graphql = new NodejsFunction(this, 'lambda', {
      entry: './src/graphql-server/dist/function.js',
      handler: 'handler',
      memorySize: 128, // Max
      minify: true, // To fit below 1MB code limit
      timeout: Duration.millis(5000), // Max
      role: new Role(this, 'AllowLambdaServiceToAssumeRole', {
        assumedBy: new CompositePrincipal(
          new ServicePrincipal('lambda.amazonaws.com'),
          new ServicePrincipal('edgelambda.amazonaws.com')
        ),
        managedPolicies: [
          ManagedPolicy.fromManagedPolicyArn(
            this,
            'gql-server-managed-policy',
            'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'
          ),
        ],
      }),
    });

    table.grantFullAccess(graphql);
  }
}
```

Out of the box, our Lambda function does not have sufficient permissions to read and write from DynamoDB table. To fix that, we can use `grantFullAccess`, which permits all DynamoDB operations (`"dynamodb:*"`) to an IAM principal. This one-liner is much more convenient than specifying a custom IAM Role/Policy which iterates through the list of provisioned tables.

```jsx
export class GraphQLAtEdge extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const table = new Table(this, 'globdynamodb', {
      partitionKey: { name: 'hashKey', type: AttributeType.STRING },
      replicationRegions,
    });

    const bucket = new Bucket(this, 'bucket', {
      publicReadAccess: true,
      websiteIndexDocument: 'playground.html',
    });

    const graphql = new NodejsFunction(this, 'lambda', {
      entry: './src/graphql-server/dist/function.js',
      handler: 'handler',
      memorySize: 128, // Max
      minify: true, // To fit below 1MB code limit
      timeout: Duration.millis(5000), // Max
      role: new Role(this, 'AllowLambdaServiceToAssumeRole', {
        assumedBy: new CompositePrincipal(
          new ServicePrincipal('lambda.amazonaws.com'),
          new ServicePrincipal('edgelambda.amazonaws.com')
        ),
        managedPolicies: [
          ManagedPolicy.fromManagedPolicyArn(
            this,
            'gql-server-managed-policy',
            'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'
          ),
        ],
      }),
    });

    table.grantFullAccess(graphql);

    const graphqlVersion = graphql.addVersion(
      ':sha256:' + sha256('./src/graphql-server/function.ts')
    );
  }
}
```

To make deploying faster, we can tell CDK to update the function only if `sha256` of its source code has changed.

```jsx
export class GraphQLAtEdge extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const table = new Table(this, 'globdynamodb', {
      partitionKey: { name: 'hashKey', type: AttributeType.STRING },
      replicationRegions,
    });

    const bucket = new Bucket(this, 'bucket', {
      publicReadAccess: true,
      websiteIndexDocument: 'playground.html',
    });

    const graphql = new NodejsFunction(this, 'lambda', {
      entry: './src/graphql-server/dist/function.js',
      handler: 'handler',
      memorySize: 128, // Max
      minify: true, // To fit below 1MB code limit
      timeout: Duration.millis(5000), // Max
      role: new Role(this, 'AllowLambdaServiceToAssumeRole', {
        assumedBy: new CompositePrincipal(
          new ServicePrincipal('lambda.amazonaws.com'),
          new ServicePrincipal('edgelambda.amazonaws.com')
        ),
        managedPolicies: [
          ManagedPolicy.fromManagedPolicyArn(
            this,
            'gql-server-managed-policy',
            'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'
          ),
        ],
      }),
    });

    table.grantFullAccess(graphql);

    const graphqlVersion = graphql.addVersion(
      ':sha256:' + sha256('./src/graphql-server/function.ts')
    );

    const distribution = new CloudFrontWebDistribution(this, 'MyDistribution', {
      originConfigs: [
        {
          s3OriginSource: {
            s3BucketSource: bucket,
            originAccessIdentity: new OriginAccessIdentity(this, 'cloudfront-oai'),
          },
          behaviors: [
            {
              isDefaultBehavior: true,
              allowedMethods: CloudFrontAllowedMethods.ALL,
              lambdaFunctionAssociations: [
                {
                  eventType: LambdaEdgeEventType.VIEWER_REQUEST,
                  lambdaFunction: graphqlVersion,
                },
              ],
            },
          ],
        },
      ],
    });
  }
}
```

The last step is to provision CloudFront CDN with an S3 bucket as an origin and a function from the previous step as an interceptor of viewer requests.

```jsx
export class GraphQLAtEdge extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const table = new Table(this, 'globdynamodb', {
      partitionKey: { name: 'hashKey', type: AttributeType.STRING },
      replicationRegions,
    });

    const bucket = new Bucket(this, 'bucket', {
      publicReadAccess: true,
      websiteIndexDocument: 'playground.html',
    });

    const graphql = new NodejsFunction(this, 'lambda', {
      entry: './src/graphql-server/dist/function.js',
      handler: 'handler',
      memorySize: 128, // Max
      minify: true, // To fit below 1MB code limit
      timeout: Duration.millis(5000), // Max
      role: new Role(this, 'AllowLambdaServiceToAssumeRole', {
        assumedBy: new CompositePrincipal(
          new ServicePrincipal('lambda.amazonaws.com'),
          new ServicePrincipal('edgelambda.amazonaws.com')
        ),
        managedPolicies: [
          ManagedPolicy.fromManagedPolicyArn(
            this,
            'gql-server-managed-policy',
            'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'
          ),
        ],
      }),
    });

    table.grantFullAccess(graphql);

    const graphqlVersion = graphql.addVersion(
      ':sha256:' + sha256('./src/graphql-server/function.ts')
    );

    const distribution = new CloudFrontWebDistribution(this, 'MyDistribution', {
      originConfigs: [
        {
          s3OriginSource: {
            s3BucketSource: bucket,
            originAccessIdentity: new OriginAccessIdentity(this, 'cloudfront-oai'),
          },
          behaviors: [
            {
              isDefaultBehavior: true,
              allowedMethods: CloudFrontAllowedMethods.ALL,
              lambdaFunctionAssociations: [
                {
                  eventType: LambdaEdgeEventType.VIEWER_REQUEST,
                  lambdaFunction: graphqlVersion,
                },
              ],
            },
          ],
        },
      ],
    });

    (distribution.node.defaultChild as CfnDistribution).addOverride([
      'Properties',
      'DistributionConfig',
      'DefaultCacheBehavior',
      'LambdaFunctionAssociations',
      '0',
      'IncludeBody'
    ].join('.'), true);
  }
}
```

Actually, there's _one more thing_. Because as I'm writing this, `LambdaFunctionAssociation` does not support `includeBody` parameter. We need to use CDK's [escape hatch](https://docs.aws.amazon.com/cdk/latest/guide/cfn_layer.html) to modify synthesized CloudFormation template manually. This is really useful if we want to use some CFN functionality that hasn't been added to the CDK yet.

</CodeWave>

> If you don't like this animation, checkout full source at [Github](https://github.com/RafalWilinski/edge-graphql-dynamodb-api/blob/master/lib/serverless-global-graphql-api-dynamodb-stack.ts). You can play with it using mentioned [GraphQL Playground here](https://d1pc7a0vu5q5b3.cloudfront.net/playground).

What's great about this solution is:

- It's completely _Serverless_. Costs me nothing if it's not used. I'm billed on data stored, read and transferred basis
- It's highly available on all levels, from data layer up to the public endpoint(s)
- It's fast, apart from [cold-starts](https://lumigo.io/blog/how-to-improve-aws-lambda-cold-start-performance/)
- Thanks to CDK and [jsii](https://github.com/aws/jsii), application code and infrastructure definition is written in one language. This reduces the amount of context shifts and reduces the cognitive load on devs. You can do that with C#, Java, and Python too, because [CDK supports all of them](https://docs.aws.amazon.com/cdk/latest/guide/multiple_languages.html)
- Maintaining or modifying it is a _breeze_. Creating the same solution using CloudFormation or Terraform would take x5 amount of code

But not it's definitely **not** ideal, there are some very important cons:

- Your ~~server~~ GraphQL endpoint must be lightweight. Minified Lambda@Edge code must be less than 1 MB. Moreover, it is restricted to `128MB` of memory and `5000ms` of execution time for `VIEWER_REQUEST` integration type. Definitely not usable for heavy computation because [Lambda computing power is scaling with allocated memory](https://engineering.opsgenie.com/how-does-proportional-cpu-allocation-work-with-aws-lambda-41cd44da3cac?gi=9a8c6fdb9ff0)
- Cannot use environment variables with Lambda@Edge
- It's using low-level GraphQL.js library where schema creation is tedious; I wasn't able to deploy fully-featured [Apollo Server](https://www.apollographql.com/docs/apollo-server/), which is standard in Node.js world. It's hard to keep it under `1MB` code limit and under `128MB` memory usage limit
- [DynamoDB Global tables](https://dynobase.dev/dynamodb-global-tables/) are [eventually consistent](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/V2globaltables_HowItWorks.html). In a global table, data modifications are usually propagated to all replica tables within a second. It is a deal-breaker for many use cases. They also [cost](https://dynobase.dev/dynamodb-pricing-calculator/) much more because you also pay for _Replicated write request units_ and it scales linearly with the amount of table replicas.

Concluding - is it useful?

_Might be_ for some very specific use cases. Right now, due to Lambda@Edge limitations - not really. With imposed restrictions, it disallows creating any serious logic. But, I hope these will change in the future. AWS is developing its FaaS offering very actively, continually making it better. For now, if I will need to create a Serverless GraphQL API, I'll probably stick to [AppSync](https://aws.amazon.com/appsync/).
