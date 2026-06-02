# Fresh Data Import Workbook

Use one `.xlsx` workbook with these sheet names:

1. `Users`
2. `Eligibility`
3. `Reviewer Assignment`
4. `Criteria Questions`
5. `Salary Arrear`
6. `Login Access`

Emails are normalized to lowercase during import. Required fields, duplicate employee IDs, duplicate emails, role values, dates, and status values are validated before data is written.

## Users

`employee_id`, `full_name`, `official_email`, `personal_email`, `phone_number`, `department`, `designation`, `role`, `reporting_manager_email`, `reviewer_email`, `management_email`, `partner_email`, `date_of_joining`, `employment_type`, `status`

Allowed `role`: `ADMIN`, `HR`, `EMPLOYEE`, `REVIEWER`, `MANAGER`, `MANAGEMENT`, `PARTNER`

## Eligibility

`employee_id`, `appraisal_type`, `cycle_name`, `cycle_start_date`, `self_assessment_deadline`, `reviewer_deadline`, `management_review_deadline`, `meeting_date`, `cycle_status`

## Reviewer Assignment

`employee_id`, `reviewer_email`, `reviewer_type`, `reviewer_deadline`, `status`

## Criteria Questions

`criteria_id`, `category`, `question_text`, `max_rating`, `role_applicable`, `is_active`

## Salary Arrear

`employee_id`, `current_salary`, `proposed_salary`, `final_salary`, `arrear_amount`, `arrear_status`, `effective_date`

## Login Access

`employee_id`, `official_email`, `role`, `account_status`, `google_login_allowed`, `initial_password_required`, `passkey_required`, `force_passkey_setup`
