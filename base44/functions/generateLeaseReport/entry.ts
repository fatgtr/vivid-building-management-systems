import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { file_url, lease_id, format = 'detailed' } = await req.json();

        if (!file_url) {
            return Response.json({ error: 'file_url is required' }, { status: 400 });
        }

        // Generate comprehensive lease summary report
        const report = await base44.integrations.Core.InvokeLLM({
            prompt: `Analyze this lease agreement and generate a comprehensive summary report.

Extract and summarize all critical information including:
- Parties involved (landlord, tenant, agents)
- Property details and address
- Lease term and important dates
- Rent amount and payment terms
- Bond/deposit information
- Special conditions and clauses
- Maintenance responsibilities
- Notice periods and break clauses
- Restrictions (pets, subletting, renovations)
- Utilities and outgoings
- Any red flags or unusual terms

Provide a ${format} analysis that is clear, organized, and highlights key risks or considerations.`,
            file_urls: [file_url],
            response_json_schema: {
                type: "object",
                properties: {
                    executive_summary: { type: "string" },
                    parties: {
                        type: "object",
                        properties: {
                            landlord_name: { type: "string" },
                            tenant_name: { type: "string" },
                            agent_name: { type: "string" },
                            agent_contact: { type: "string" }
                        }
                    },
                    property: {
                        type: "object",
                        properties: {
                            address: { type: "string" },
                            unit_number: { type: "string" },
                            property_type: { type: "string" },
                            bedrooms: { type: "number" },
                            bathrooms: { type: "number" },
                            parking_spaces: { type: "number" }
                        }
                    },
                    financial_terms: {
                        type: "object",
                        properties: {
                            rent_amount: { type: "number" },
                            rent_frequency: { type: "string" },
                            bond_amount: { type: "number" },
                            first_payment_date: { type: "string" },
                            rent_increase_clause: { type: "string" },
                            payment_method: { type: "string" }
                        }
                    },
                    lease_term: {
                        type: "object",
                        properties: {
                            start_date: { type: "string" },
                            end_date: { type: "string" },
                            duration_months: { type: "number" },
                            lease_type: { type: "string" },
                            renewal_options: { type: "string" }
                        }
                    },
                    responsibilities: {
                        type: "object",
                        properties: {
                            tenant_maintenance: {
                                type: "array",
                                items: { type: "string" }
                            },
                            landlord_maintenance: {
                                type: "array",
                                items: { type: "string" }
                            },
                            utilities_included: {
                                type: "array",
                                items: { type: "string" }
                            },
                            utilities_tenant_pays: {
                                type: "array",
                                items: { type: "string" }
                            }
                        }
                    },
                    restrictions: {
                        type: "object",
                        properties: {
                            pets_allowed: { type: "boolean" },
                            pets_conditions: { type: "string" },
                            subletting_allowed: { type: "boolean" },
                            smoking_allowed: { type: "boolean" },
                            alterations_allowed: { type: "boolean" },
                            alterations_conditions: { type: "string" }
                        }
                    },
                    notice_periods: {
                        type: "object",
                        properties: {
                            tenant_notice_days: { type: "number" },
                            landlord_notice_days: { type: "number" },
                            break_clause: { type: "string" },
                            entry_notice_hours: { type: "number" }
                        }
                    },
                    special_conditions: {
                        type: "array",
                        items: { type: "string" }
                    },
                    red_flags: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                severity: { type: "string" },
                                issue: { type: "string" },
                                recommendation: { type: "string" }
                            }
                        }
                    },
                    compliance_check: {
                        type: "object",
                        properties: {
                            appears_compliant: { type: "boolean" },
                            issues_found: {
                                type: "array",
                                items: { type: "string" }
                            },
                            recommendations: {
                                type: "array",
                                items: { type: "string" }
                            }
                        }
                    },
                    key_dates: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                date: { type: "string" },
                                event: { type: "string" },
                                importance: { type: "string" }
                            }
                        }
                    }
                }
            }
        });

        // Update lease agreement with report if lease_id provided
        if (lease_id) {
            await base44.entities.RentalAgreement.update(lease_id, {
                ai_summary_report: report,
                report_generated_date: new Date().toISOString(),
                key_dates_extracted: report.key_dates
            });
        }

        // Create calendar events for key dates
        if (report.key_dates && report.key_dates.length > 0) {
            for (const keyDate of report.key_dates.filter(d => d.importance === 'high')) {
                await base44.entities.CalendarEvent.create({
                    title: `Lease: ${keyDate.event}`,
                    description: `Important lease date for ${report.property.address}`,
                    event_date: keyDate.date,
                    event_type: 'lease_milestone',
                    related_entity_type: 'lease',
                    related_entity_id: lease_id,
                    created_by: user.email
                });
            }
        }

        return Response.json({
            success: true,
            report,
            message: 'Lease report generated successfully'
        });

    } catch (error) {
        console.error('Error generating lease report:', error);
        return Response.json({ 
            error: error.message,
            success: false
        }, { status: 500 });
    }
});