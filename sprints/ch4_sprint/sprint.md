# Sprint Meeting Notes

**Attended**: Sam & Fernando

**DATE**: 10/6/2025

***

## Sprint Review

### SRS Sections Updated

* Software Requirement specification
* Requirements

### User Story

* View banking information from multiple accounts

### Sprint Requirements Attempted

* Plaid Integration for account retrieval
* Display data retrieved from plaid api


### Completed Requirements

* Plaid Integration for account retrieval
* Display data retrieved from plaid api

### Incomplete Requirements

* n/a

### The summary of the entire project

User can create an account and login to view all their connected bank accounts. The user has the ability to refresh to see their most updated balances, and can connect different accounts. 

***

## Sprint Planning

## Requirements Flex

3/3 requirement flexes remaining

## Technical Debt

* n/a

### Requirement Target

* User verification
* Plaid transaction
* Display plaid transactions

### User Stories

* Security
* Viewing banking information from multiple accounts

### Planning

Fernando will set up and test account verification and transactions. Sam will create verifications screens and ensure user can only access plaid add account button if account is verified, as well as incorperating account transactions to 

### Action Items

* Successful integration of auth handling
* UI displaying account transaction information
* Successful retrieval of account transaction data

### Issues and Risks

* Figuring out how to prevent users from accessing plaid without being verified  

### Team Work Assignments

* Sam: display financial transactions, prevent viewing of plaid unless user is verified
* Fernando: auth handling, and plaid transaction integration