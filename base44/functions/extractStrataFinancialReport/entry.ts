import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { file_url } = await req.json();
    if (!file_url) return Response.json({ error: 'file_url is required' }, { status: 400 });

    const extracted = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a strata financial report parser. Analyse the attached strata status report PDF (an Australian strata financial statement, typically covering an Administrative Fund and a Capital Works / Sinking Fund).

Extract the following into the JSON schema provided:
- Strata plan number (digits only if possible), property address, and strata managing agent name.
- Reporting period start and end dates, and the balance-sheet "as at" date (ISO yyyy-mm-dd where possible; if only month/year, use the first or last day accordingly).
- Administrative Fund: income (actual, full-year budget, prior year), expenditure (actual, full-year budget, prior year), opening balance, closing balance, and surplus/deficit for the period.
- Capital Works Fund: same set of fields.
- Bank balances: admin fund bank, capital works fund bank, total cash at bank.
- Balance-sheet totals: total current assets, total liabilities, total owners funds, creditors total, levies in arrears, levies in advance.
- Line items: an array of expenditure lines for the Administrative Fund (category name, budget, actual, payee if shown). An array of expenditure lines for the Capital Works Fund likewise. An array of creditor balances (supplier name, amount). An array of payments drawn this period (payee, description, amount, category).

Use 0 for any numeric field not present in the report. Use empty string for text fields not present. Be precise with numbers — parse them as plain numbers (no commas, currency symbols, or parentheses). Negative balances should be represented as negative numbers.`,
      file_urls: [file_url],
      response_json_schema: {
        type: "object",
        properties: {
          strata_plan_number: { type: "string" },
          address: { type: "string" },
          strata_manager_name: { type: "string" },
          report_period_start: { type: "string" },
          report_period_end: { type: "string" },
          as_at_date: { type: "string" },
          admin_fund: {
            type: "object",
            properties: {
              income_actual: { type: "number" },
              income_budget: { type: "number" },
              income_prior_year: { type: "number" },
              expenditure_actual: { type: "number" },
              expenditure_budget: { type: "number" },
              expenditure_prior_year: { type: "number" },
              opening_balance: { type: "number" },
              closing_balance: { type: "number" },
              surplus_deficit: { type: "number" }
            }
          },
          capital_works_fund: {
            type: "object",
            properties: {
              income_actual: { type: "number" },
              income_budget: { type: "number" },
              income_prior_year: { type: "number" },
              expenditure_actual: { type: "number" },
              expenditure_budget: { type: "number" },
              expenditure_prior_year: { type: "number" },
              opening_balance: { type: "number" },
              closing_balance: { type: "number" },
              surplus_deficit: { type: "number" }
            }
          },
          bank_admin_balance: { type: "number" },
          bank_capital_works_balance: { type: "number" },
          bank_total_balance: { type: "number" },
          total_assets: { type: "number" },
          total_liabilities: { type: "number" },
          owners_funds_total: { type: "number" },
          creditors_total: { type: "number" },
          levies_in_arrears: { type: "number" },
          levies_in_advance: { type: "number" },
          admin_expenditure_lines: {
            type: "array",
            items: {
              type: "object",
              properties: {
                category: { type: "string" },
                budget: { type: "number" },
                actual: { type: "number" },
                payee: { type: "string" }
              }
            }
          },
          capital_works_expenditure_lines: {
            type: "array",
            items: {
              type: "object",
              properties: {
                category: { type: "string" },
                budget: { type: "number" },
                actual: { type: "number" },
                payee: { type: "string" }
              }
            }
          },
          creditor_lines: {
            type: "array",
            items: {
              type: "object",
              properties: {
                payee: { type: "string" },
                amount: { type: "number" }
              }
            }
          },
          payment_lines: {
            type: "array",
            items: {
              type: "object",
              properties: {
                payee: { type: "string" },
                description: { type: "string" },
                amount: { type: "number" },
                category: { type: "string" }
              }
            }
          }
        }
      }
    });

    return Response.json({ success: true, data: extracted });
  } catch (error) {
    console.error('extractStrataFinancialReport error:', error);
    return Response.json({ error: error.message, success: false }, { status: 500 });
  }
}