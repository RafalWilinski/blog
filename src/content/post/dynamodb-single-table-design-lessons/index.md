---
title: Lessons learned using Single-table design with DynamoDB
description: Lessons learned using Single-table design with DynamoDB and GraphQL in production
tags: ["aws", "dynamodb", "graphql"]
publishDate: "29 November 2019"
image: https://servicefull.cloud/images/template-servicefull.png
---

DynamoDB is a powerful yet tricky beast. While it enables [insane scalability](https://aws.amazon.com/blogs/aws/amazon-prime-day-2019-powered-by-aws/), it has some stringent limitations that you need to be aware of. It is also impossible to go with such a NoSQL database with an RDBMS mindset. Change in thinking is necessary, and that process is laborious. After almost a year of developing a fully serverless GraphQL API and shipping it to the production with thousands of users, I present you my learnings from this endeavor.

## Planning your query access patterns is essential

I can't stress enough how important it is. Because you cannot change primary indexes or LSIs, the only option is to create a new one, migrate the data with some transformations, and delete the old table. This process is excruciating, especially after you're in the production, and you want it to avoid it at all costs. If you don't know how to do that, I highly recommend two articles: [One by Jeremy Daly](https://www.jeremydaly.com/how-to-switch-from-rdbms-to-dynamodb-in-20-easy-steps/) and the second one [by Forrest Brazeal](https://www.trek10.com/blog/dynamodb-single-table-relational-modeling/).

This step is not just purely engineering task, but it blends with business and product competences. That's why I think you should participate in the planning session as soon as possible to understand business use cases better and propose developer-friendly solutions. Precise requirements equal to a happy developer(s) equals product delivered, and deadline met.

## Attribute `model` is advantageous to distinct entity types

In our use case, having an attribute `model` as the primary key in one of the GSIs (Global Secondary Index), which always indicated the type of row, was very helpful. With a simple query where `model` was a `hashKey` we could get all Members, Channels, Roles, Audiences, etc.

## Invest some time in proper abstractions and create your own opinionated ORM

As you start writing some code persistence layer code, you'll immediately notice that many things are repeating, and most API calls require complex parameters like `UpdateExpression` or `ExpressionAttributeValues`. These should be abstracted away into more straightforward function signatures.

Here are some ideas:

- Each call will require `TableName` (precisely the same with single-table design) and `IndexName`. Writing that into each call is unnecessary duplication
- You should always use `Limit` (more on that later), and probably you should also restrict that number to some upper bound like 1000. Something like `Math.min(params.limit, 1000)` could also be there
- Constructing `FilterExpressions` is cumbersome. Invest some time in writing abstraction for that like [builder pattern](https://www.journaldev.com/1425/builder-design-pattern-in-java)
- Your records in the database probably include `pk`, `sk`, `data` while your models probably have attributes like `id`, `productId` etc. Some mapping function here was beneficial for us.

If you're not sure what you need, consider using [DynamoDB Toolbox](https://github.com/jeremydaly/dynamodb-toolbox), an excellent _not-an-ORM_ library by Jeremy Daly. Unfortunately, this wasn't available year ago when my project started, but if I were to start a project today, this would be a no-brainer for me.

## Use `keepAlive` HTTP optimization trick

By default, each time you make an operation with DynamoDB, a new three-way handshake is established. That takes unnecessary time. You can fix this by replacing `httpOptions.agent` with custom one in AWS SDK options like so:

```
const agent = new https.Agent({
 keepAlive: true,
 maxSockets: 50,
 rejectUnauthorized: true
});
AWS.config.update({ httpOptions: { agent }});
```

## Blacklist action `dynamodb:Scan` in IAM roles/policies

This one I got from [Jared Short](https://twitter.com/ShortJared/status/1184028703862472704). If you want to prevent your developers from writing Scans (which is a bad practice), just deny `dynamodb:Scan` IAM action in developers and application IAM roles. Brutal yet super simple and effective technique leveraging IAM not only for security but also to enforce best practices.

## Use X-Ray and Contributor Insights to find bottlenecks and problematic access patterns

Even though we haven't used [Contributor Insights](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/contributorinsights_HowItWorks.html) in the mentioned project because it has been just announced as a part of pre re:Invent release hype train, I gave it a shot in my side-project. This diagnostic tool is definitely helpful in performance tuning and finding bottlenecks by finding the most frequently accessed partition keys.

However, what we do use actively in our production application in AWS X-Ray. With [subsegments](https://docs.aws.amazon.com/xray/latest/devguide/xray-sdk-dotnet-subsegments.html) we managed to find which subqueries of our complex GraphQL queries were causing our responses to slow down and try to rewrite these parts of the application.

What's also been helpful was [Service Map](https://docs.aws.amazon.com/xray/latest/devguide/xray-console.html#xray-console-servicemap). Just a glance at it showed us that our problem lies in custom authorizer function, which fetched too much data and caused slowdown to the whole API.

## Be aware of lack of referential integrity, and it's consequences

Because DynamoDB is [eventually consistent](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadConsistency.html) and does not guarantee data integrity _(by that I mean for example weak entities in Many-to-Many relationships *do not* guarantee that referenced record exists)_ you need to pay special attention in application code when checking for `null`s or `undefined`s. This might lead to numerous `ReferenceErrors`.

In our case, when we were using GraphQL, this also led to cases violating the contract specified in the schema. Some attributes like `member: Member!` _(`!` means that API guarantees that model Member is present)_ started returning errors.

Lesson learned: _always_ assume that some data might be missing.

## Consider removing orphaned records and weak entities asynchronously

Imagine a scenario where you have a system with entity `Group` which can have many `Members`. Members are linked to the group using separate records where `pk: Group-ID` and `sk: Member-ID`. In such a scenario in SQL world, features like `FOREIGN KEYS` and `ON DELETE CASCADE` would guarantee that once "Group" is deleted, all "membership" records would be deleted too.

Unfortunately, that's not the case in Dynamo.

You might say - let's do that synchronically. That's not a good idea. This probably would take too much time inside Lambda and [should be instead distributed](https://servicefull.cloud/blog/dynamodb-mass-update/).

But you might ask, Why remove at all? Isn't DynamoDB _infinitely scalable_? What are the cons of removing?

- Saves space, which means less money spent. Remember that it costs 0.25USD per GB-month
- Queries consume less read capacity
- Less garbage in the table and less referential integrity issues

## Use VPC endpoints if possible

[VPC Endpoints](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-endpoints.html) are powerful small things that allow resources inside your VPC interact with other AWS' Services without leaving the Amazon network. This trick not only increases security but also makes interactions with DynamoDB faster. Oh, and your instances don't need public IP. Keep in mind that just like DynamoDB itself, this also has some limitations which include:

- You cannot access DynamoDB streams
- You cannot create an endpoint between a VPC and a service in a different region.
- There's a limit of VPC endpoints per VPC

You can read more about [VPC Gateway Endpoints for DynamoDB here](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-endpoints-ddb.html).

## Avoid storing big items

In the beginning, we've made this mistake - we started storing avatar blobs inside `avatar` attribute. This wasn't a good idea. As a single query only returns a result set that fits within the 1 MB size limit, we sometimes saw some calls returning only 3 items effectively, making everything slower than it should be. Solving this problem was fortunately quite easy - we uploaded all blobs to S3 and just saved the link referencing it in the table.

## Always use `Limit` in queries and paginate

In our case, DynamoDB served the purpose of the persistence layer for community platform API. In use cases like that, according to our analyses, users are most likely to be interested in the latest 10 announcements or messages in a channel. If they would like to see more, they could just request it, and the application would get them these using pagination. This approach of returning a minimal amount of data at first gave us a range of benefits:

- Database returned a smaller amount of data, so our API also returned a smaller amount of data, making everything faster and more responsive
- Because there were fewer data returned, our Lambdas also needed less time to process it, so we paid even less for the compute part of Serverless stack
- Moreover, less read capacity was consumed - even less money spent 💸

## Favor `FilterExpressions` over native `Array.filter` functions

While it's tempting to use native `Array.filter` capabilities because it's more elegant, favor using `FilterExpressions` despite being it a little bit cumbersome. I know it requires creating a string that maps to `ExpressionAttributeValues` and `ExpressionAttributeNames`, but it pays of in performance. Because the filtering is done on a DB level, less data is consumed, and less data is returned. This converts directly to less money spent on data transfer, compute and memory needed to process it.

## Be aware of DynamoDB Limits

Spend some time [reading the docs about limitations](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Limits.html), seriously. It would save us many frustrations. Some things that were surprising to us include:

- `BatchWriteItem` supports up to 25 items. This means that if you'd like to write 100 items you have to _chunkify_ your array into 4 parts and run BatchWriteItem four times wrapped with `await Promise.all`
- The attribute value cannot be an empty string
- Maximum item size is 400 KB

## Always use `ExpressionAttributeNames`

There are so many [reserved keywords](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ReservedWords.html) in DynamoDB, that instead of guessing if it's reserved and what's not assume every attribute name is reserved. This should be hidden from developers by your _something-like-ORM_ abstraction, which I've mentioned earlier.

## TTL does not guarantee that your items will be removed immediately

I've stumbled upon this information [while browsing Twitter one day](https://twitter.com/prestomation/status/1146473166228692998). The time-to-live attribute does not guarantee that the item will be removed immediately after the selected time. It will be removed with a delay, sometimes taking up to 48h. This might lead you to return incorrect results if you rely only on this mechanism.

To prevent that, as [official note states](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/howitworks-ttl.html): "use a Filter Expression that returns only items where the Time-to-Live expiration value is greater than the current time."

## Use SQS to buffer large Write, Update and Delete operations

A common trick to prevent from your table from consuming too much WCU (Write Capacity Units) or having your requests throttled because of too much data coming in, is to buffer-write operations and perform them asynchronously if it's possible. It is the official AWS' recommendation, and I've also [wrote a blog post about it earlier](https://servicefull.cloud/blog/dynamodb-mass-update/).

## Use better GUI for DynamoDB

During the development, we found working with AWS Console for DynamoDB quite cumbersome. Because of this frustration, I decided to start my own project which aims to solve all the problems I had: lack of bookmarks, multiple tabs, code generation and so on. The result of that effort is [Dynobase](https://dynobase.dev/) - modern, flexible and fast DynamoDB editor.
