# ClearChat
This is the repository for the [ClearChat](https://clearchat.cc) project.

For details on ClearChat check out [this blog post](https://blog.lineup.ninja/how-to-keep-your-video-chat-safe-and-secure-with-clearchat-be1a4328d136).

# Project Structure

The repository is organized into the following:

* brochure - The ember app for the 'brochure' website. On this site the user can learn about ClearChat and claim a room.
* frontend - The ember app for the main application. Users and admins interact with their room through this component.
* backend - The backend for both 'frontend' and 'brochure'. This consists of AWS Lambda functions for the HTTP and Websocket endpoints
* cdk - The application is deployed to AWS using AWS CDK.

# Deployment

To deploy the application you will need:

* An AWS account
* A domain you can delegate to Route 53
* A SendGrid account (this is for sending the admin links when creating new rooms). If you use another service feel free to submit a PR for a different integration.

To get started create a `.env` file at the root of the project and set these variables

    AWS_REGION=
    AWS_ACCOUNT_ID=
    AWS_PROFILE=
    SENDGRID_API_KEY=

Then to perform the deployment run

    make deploy zone='the.zone.to.run.clearchat.on'

When the deploy runs you it will deploy a number of CloudFormation stacks. The first stack it deploys creates the Route 53 domain. You will need to arrange the delegation to this created domain before you allow the 'Certificates' stacks to deploy, because they will perform DNS validation on the certificate issuing.

# Help

We appreciate there's not a ton of info here. If you're interested in getting involved either open an issue or contact admin@clearchat.cc and we'll be happy to assist.

# License

This project, and all contributions, are licensed under Apache License v2.0
