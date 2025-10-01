# **Project Overview**

## **Application Vision/Goal:**
The purpose of our project is to simplify personal finance management. Today, people juggle multiple accounts - credit cards, savings, mortgages, and more - making it difficult to get a clear picture of their finances. Our app brings all of these accounts together in one place, helping users track spending habits and make smarter financial decisions. Beyond simple tracking, the app provides insights and comparisons - for instance, showing how a $7 dollar coffee could instead grow if invested in the stock market with a company like NVIDIA. Our target audience is young adults who want to gain a finanical endge, build healthy money habits early, and be encourages to invest while they are still young. 

## **Scope:**
Dashboard displaying all connected user accounts

Insights page showing personalized recommendations for spending and investing

Analysis page with an AI-powered assistant that answers user questions and provides financial guideance

## **Deliverables:**
A funcationl web application with secure login and account integration

A dashboard for viewing connected accounts and spending habits

An insights feature that highlihgts opportunities to save or invest

An AI-powered anaylsis tool for personalized finaical guidance

Supporting documentation for setup, user and future development

## **Success Criteria:**
Delivery of a stable, working MVP with the core dashboard, insights, and analysis features

Successful integration of the AI financial analyzer to users experience a reliable "personal advisor" feel 

Secure handling of financial data, meeting baseline security standards

Positive user feedback on usability and clarity of insights

## **Assumptions:**
The AI model can be developed or integrated with available tools and resources

User data can be securely stored, accessed, and processed

The target audience has at least a basic understanding of personal finance concepts

Development will prioritize delivering a functional MVP over advanced features

## **Risks:**
Security Risks: Handling sensitive financial data requires strong encryption and protection against breaches

Technical Risks: Difficulty implementing or training an effective AI model could delay delivery

Resource Risks: Limited time and development experience may constrain scope and polish of the final product

User Trust: Without strong transparency and reliability, users may hesitate to adopt the app

## **Design / Architectural Review:**
Architecture: Likely monolithic for simplicity and speed of development, though microservices could be considered for scalability in the future

Database: Required for storing user accounts, transactions, and spending data

Major Components:

Authentication and account integration

Dashboard and insights services

AI financial analysis module

Frontend with a strong focus on UX/UI, as usability will make or break adoption

## **Test Environment:**
Testing will include a combination of automated and manual approaches

Frontend: React component testing frameworks (e.g., Jest, React Testing Library) for UI/UX validation

Backend: Unit tests for core functionality, especially account handling and data processing

Integration: Build pipelines will run tests automatically, flagging failures early

Environment: Tests will run in a local development environment, with potential expansion to a staging environment before production

---

# **Team Setup**

## **Team Members:**
Samuel Montes
Fernando Oliveira

## **Team Roles:**
Samuel Montes: frontend/database/server/testing
Fernando Oliveira: backend/server/api/ml-models/testing

## **Team Norms:**
Weekly communication through class time and discord
Update team member whenever changes are made

## **Application Stack:**
Front end: React
Back end: Node.js, Nginx, MongoDB

### **Libraries/Frameworks:**
React, tailwindCSS, Express.js, mongoose, bycrypt, pytorch

