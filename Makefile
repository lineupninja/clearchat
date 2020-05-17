define HELP

Usage:

make build                          - Build
make deploy zone='my.zone'          - Deploy

endef

export HELP

EXECUTION_DATE:=$(shell date +'%Y%m%d%H%M')

namePrefix=`echo ${zone} | tr . -`

include .env

all help:
	@echo "$$HELP"

build: build-backend build-cdk build-brochure build-frontend

build-backend:
	cd backend; npm run build

build-brochure:
	cd brochure; ember build -prod

build-cdk:
	cd cdk; npm run build

build-frontend:
	cd frontend; ember build -prod

# Do no called build-brochure and build-frontend as the build will be perfomred by ember deploy
deploy: build-backend build-cdk deploy-backend deploy-frontend deploy-brochure

deploy-backend:
	cd cdk; AWS_ACCOUNT_ID=${AWS_ACCOUNT_ID} AWS_REGION=${AWS_REGION} SENDGRID_API_KEY=${SENDGRID_API_KEY} HOSTED_ZONE_NAME=${zone} npx cdk deploy '*'  --profile ${AWS_PROFILE} --outputs-file cdk.outputs.json

deploy-brochure: make-ember-env
	cd brochure; AWS_PROFILE=${AWS_PROFILE} HOSTED_ZONE_NAME=${zone} S3_BUCKET=${namePrefix}-brochure AWS_REGION=eu-west-2 ember deploy production --activate

deploy-frontend: make-ember-env
	cd frontend; AWS_PROFILE=${AWS_PROFILE} HOSTED_ZONE_NAME=${zone} S3_BUCKET=${namePrefix}-frontend AWS_REGION=eu-west-2 ember deploy production --activate

make-ember-env:
	cd cdk; bin/make-ember-env.sh