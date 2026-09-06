# Expense Tracker Spring Backend

Java Spring Boot backend for the React frontend.

## Run

```bash
cd backend-spring
./mvnw spring-boot:run
```

To enable real OpenAI answers in AI Advisor:

```bash
export OPENAI_API_KEY="your_api_key_here"
export OPENAI_MODEL="gpt-5.2"
./mvnw spring-boot:run
```

Or create a local-only file that is ignored by git:

```text
backend-spring/src/main/resources/application-local.properties
```

```properties
openai.api-key=your_new_openai_api_key_here
openai.model=gpt-5.2
```

Then run normally:

```bash
./mvnw spring-boot:run
```

Without `OPENAI_API_KEY`, `/api/ai/chat/` uses a local fallback based on saved expenses.

Backend URL:

```text
http://localhost:8090
```

Demo login:

```text
email: demo@test.com
password: demo123
```

Main API routes:

```text
POST /api/login/
POST /api/register/
GET  /api/categories/
POST /api/categories/
GET  /api/expenses/
POST /api/expenses/
PUT  /api/expenses/{id}/
DELETE /api/expenses/{id}/
GET  /api/incomes/
POST /api/incomes/
GET  /api/analytics/
POST /api/ai/chat/
```

H2 console:

```text
http://localhost:8090/h2-console
JDBC URL: jdbc:h2:file:./data/expense-tracker
User: sa
Password:
```
