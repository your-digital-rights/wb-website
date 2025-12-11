## WB Testing procedure
**Always follow this testing procedure**

### Test environment setup

- E2E tests now spin up a production Next.js build automatically. You can pre-start it manually if you prefer: `pnpm build && PORT=3783 pnpm start -- --hostname localhost`.
- Make sure a Stripe CLI listener is running (the global Playwright setup starts one when needed). You can launch it yourself with:
  ```bash
  stripe listen --events 'payment_intent.*,invoice.*,customer.*,subscription.*' \
    --forward-to http://localhost:3783/api/stripe/webhook \
    --request-timeout 120
  ```


### Test execution

1. Run the test suit as instructed:
    - For unit tests run `pnpm test:unit`
    - For unit integration run `pnpm test:integration`
    - For e2e tests run `pnpm test:e2e --project=chromium --reporter=line`. Never use `--headed`
2.  Once you identify the failing tests, use Playwrite MCP to validate if its a testing or an implementation issue, and the best way to fix it. 
3. Be patient and take your time. 
4. Once a fix has been implemented, run only the sepcific text to validate that the fix worked. If it did not repeat steps 2 to 4. 
5. Run the whole test suit and continue.
6. Don't stop until all test pass.



## Running Playwrite MCP
1. Seed the session:
curl -X POST http://localhost:3783/api/test/seed-session -H "Content-Type: application/json" -d '{"email":"mcp-test-verify@example.com"}'
2. Inject local storage using playwright MCP BEFORE {
  "function": "() => {\n  const sessionId = '6a06d99a-6963-4092-8b81-c202414e5853';\n  const formData = {\n    \"firstName\": \"Test\",\n    \"lastName\": \"User\",\n    \"email\": \"mcp-fresh-test@example.com\",\n    \"emailVerified\": true,\n    \"businessName\": \"Test Business Inc\",\n    \"industry\": \"technology-and-it-services\",\n    \"businessPhone\": \"320 123 4567\",\n    \"businessEmail\": \"business@test.com\",\n    \"businessStreet\": \"Via Test 123\",\n    \"businessCity\": \"Milano\",\n    \"businessPostalCode\": \"20123\",\n    \"businessProvince\": \"MI\",\n    \"businessCountry\": \"Italy\",\n    \"vatNumber\": \"IT12345678901\",\n    \"businessDescription\": \"A comprehensive test business providing innovative solutions for automated testing and quality assurance in modern web applications.\",\n    \"competitorUrls\": [\"https://example.com\"],\n    \"competitorAnalysis\": \"Competitor analysis for testing purposes\",\n    \"customerProfile\": {\"budget\": 50, \"style\": 50, \"motivation\": 50, \"decisionMaking\": 50, \"loyalty\": 50},\n    \"customerProblems\": \"Testing customer problems and pain points that need to be addressed\",\n    \"customerDelight\": \"Testing customer delight factors\",\n    \"websiteReferences\": [],\n    \"designStyle\": \"minimalist\",\n    \"imageStyle\": \"photorealistic\",\n    \"colorPalette\": [\"#FFFFFF\", \"#1F2937\", \"#3B82F6\", \"#F59E0B\"],\n    \"websiteSections\": [\"about\", \"services\", \"contact\"],\n    \"primaryGoal\": \"generate-leads\",\n    \"offeringType\": \"services\",\n    \"products\": [],\n\"logoUpload\": {\"name\": \"test-logo.png\", \"size\": 1024, \"type\": \"image/png\", \"url\": \"/test/logo.png\"},\n    \"businessPhotos\": [],\n    \"additionalLanguages\": []\n  };\n  \n  const zustandStore = {\n    state: {\n      sessionId: sessionId,\n      currentStep: 14,\n      completedSteps: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],\n      formData: formData,\n      sessionExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),\n      isSessionExpired: false\n    },\n    version: 1\n  };\n  \n  localStorage.clear();\n  localStorage.setItem('wb-onboarding-store', JSON.stringify(zustandStore));\n  return 'Correctly structured localStorage injected';\n}"
}