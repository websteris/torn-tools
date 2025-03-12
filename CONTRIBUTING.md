# Contributing to Torn Dashboard

Thank you for your interest in contributing to Torn Dashboard! This document provides guidelines and instructions for contributing to this project.

## Table of Contents
- [Code of Conduct](#code-of-conduct)
- [Development Environment Setup](#development-environment-setup)
- [Coding Standards and Style Guide](#coding-standards-and-style-guide)
- [Git Workflow](#git-workflow)
- [Pull Request Process](#pull-request-process)
- [Testing Requirements](#testing-requirements)
- [Issue Reporting Guidelines](#issue-reporting-guidelines)
- [Communication](#communication)

## Code of Conduct

Please follow our code of conduct in all your interactions with the project. We aim to create a positive and inclusive environment for all contributors.

- Be respectful and inclusive
- Be constructive in feedback and discussions
- Focus on what is best for the community
- Show empathy towards other community members

## Development Environment Setup

### Prerequisites

- Node.js (v14 or later)
- npm (v7 or later)
- PostgreSQL (for production) or SQLite (for development)
- Git

### Setup Steps

1. **Fork the repository** on GitHub.

2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/torn-dashboard.git
   cd torn-dashboard
   ```

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Set up environment variables**:
   - Copy `.env.example` to `.env`
   - Fill in the required environment variables
   ```bash
   cp .env.example .env
   ```

5. **Set up the database**:
   ```bash
   npm run migrate
   ```

6. **Start the development server**:
   ```bash
   npm run dev
   ```

## Coding Standards and Style Guide

We maintain consistent code formatting and style throughout the project to ensure readability and maintainability.

### JavaScript/Node.js Guidelines

- Follow [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
- Use ES6+ features where appropriate
- Use async/await instead of callbacks for asynchronous code
- Add JSDoc comments for functions and complex code blocks

### Code Formatting

- We use ESLint for linting and Prettier for code formatting
- Run linting checks before submitting PRs:
  ```bash
  npm run lint
  ```
- Format your code with:
  ```bash
  npm run format
  ```

### Naming Conventions

- Use camelCase for variables, functions, and method names
- Use PascalCase for class names
- Use UPPERCASE_SNAKE_CASE for constants
- Use descriptive names that reflect the purpose of the variable/function

### Project Structure

- Place API routes in the `/api` directory
- Database migrations should go in the `/db/migrations` directory
- Keep middleware functions in the `/middleware` directory
- Use `/services` for business logic

## Git Workflow

### Branching Strategy

We follow a simplified GitHub flow:

- `main` - Production-ready code
- `develop` - Integration branch for features
- Feature branches - Individual features and bug fixes

### Branch Naming

Use the following format for branch names:

- `feature/short-description` - For new features
- `bugfix/short-description` - For bug fixes
- `hotfix/short-description` - For critical fixes to production
- `docs/short-description` - For documentation changes

### Commit Messages

Follow these guidelines for commit messages:

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests liberally after the first line
- Consider starting the commit message with an applicable prefix:
  - `feat:` for new features
  - `fix:` for bug fixes
  - `docs:` for documentation changes
  - `style:` for formatting changes
  - `refactor:` for code refactoring
  - `test:` for adding tests
  - `chore:` for maintenance tasks

Example:
```
feat: add user authentication endpoint

Implements JWT-based authentication system.
Resolves #123
```

## Pull Request Process

1. **Create a new branch** from `develop` for your changes
2. **Make your changes** and commit them following our commit message guidelines
3. **Update documentation** if necessary
4. **Run tests** to ensure your changes don't break existing functionality
5. **Push your branch** to your forked repository
6. **Open a Pull Request** against the `develop` branch
7. **Fill in the PR template** with details about your changes

### PR Review Process

- At least one core maintainer must review and approve your PR
- Address any requested changes or feedback
- Maintain a respectful and constructive discussion

### PR Checklist

Before submitting a PR, make sure:

- [ ] Your code follows the style guidelines of this project
- [ ] You have performed a self-review of your own code
- [ ] You have commented your code, particularly in hard-to-understand areas
- [ ] You have made corresponding changes to the documentation
- [ ] Your changes generate no new warnings
- [ ] You have added tests that prove your fix is effective or that your feature works
- [ ] All tests pass (both new and existing)
- [ ] Your commit history is clean and descriptive

## Testing Requirements

We value well-tested code and maintain high test coverage:

### Types of Tests

- **Unit Tests**: Test individual functions and components
- **Integration Tests**: Test the interaction between different parts of the application
- **API Tests**: Test HTTP endpoints

### Testing Guidelines

- Write tests for all new features and bug fixes
- Aim for at least 80% test coverage for new code
- Use Jest for testing
- Place tests in the `/tests` directory with a `.test.js` suffix

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage report
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## Issue Reporting Guidelines

### Before Creating an Issue

- Check if the issue already exists in the issue tracker
- Make sure you're using the latest version of the software
- Verify the issue is not caused by your own environment setup

### Creating an Issue

When creating an issue, please provide:

1. **Clear description**: What happened vs what you expected to happen
2. **Steps to reproduce**: Detailed steps to reproduce the issue
3. **Environment details**: Node.js version, npm version, OS, etc.
4. **Logs/Screenshots**: If applicable, provide logs or screenshots
5. **Suggested solution**: If you have ideas how to fix it

### Issue Types

Use the appropriate issue template:

- **Bug Report**: For reporting bugs or unexpected behavior
- **Feature Request**: For suggesting new features
- **Enhancement**: For suggesting improvements to existing features
- **Documentation**: For suggesting documentation improvements

## Communication

- Use GitHub Issues for bug reports, feature requests, and discussions
- For quick questions, use the project's chat channels (if available)
- For security issues, please see our security policy

---

Thank you for taking the time to contribute to Torn Dashboard! Your contributions help make this project better for everyone.

