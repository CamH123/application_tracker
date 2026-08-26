# manual-application-creation Specification

## Purpose

Enable a person to record a manual Application without separately setting up
the reusable Company and Recruiting Cycle that identify it.

## Requirements

### Requirement: Manual Application creation is available without setup records

The Dashboard SHALL make New Application available regardless of whether any
Companies or Recruiting Cycles already exist. The manual creation flow SHALL
accept a Company name and a Recruiting Cycle value together with the required
Application fields.

#### Scenario: First manual Application

- **WHEN** no Companies or Recruiting Cycles exist and a person creates an
  Application with a Company name and a valid Recruiting Cycle
- **THEN** the system creates the Application and its referenced Company and
  Recruiting Cycle

#### Scenario: Manual management remains available

- **WHEN** a person visits Settings after using the manual creation flow
- **THEN** they can view and manually manage the Company and Recruiting Cycle
  created by that flow

#### Scenario: Automatically created Company is merged in Settings

- **WHEN** a person merges a Company created by the manual Application flow
  into another Company in Settings
- **THEN** the existing merge behavior moves that Company's Applications to
  the selected survivor and removes the source Company

### Requirement: Company identity is resolved from manual entry

The system SHALL resolve a manually entered Company name using the same
normalized Company identity used by manual Company management. It SHALL reuse
an existing matching Company; otherwise it SHALL create a Company with that
entered name and no candidate-portal URL.

#### Scenario: Existing Company is reused

- **WHEN** a person creates an Application using a Company name that matches an
  existing Company after normalization
- **THEN** the new Application references the existing Company

#### Scenario: New Company has no inferred portal URL

- **WHEN** a person creates an Application for a Company that does not exist
- **THEN** the system creates that Company without a candidate-portal URL

### Requirement: Recruiting Cycle entry offers existing and likely values

The manual creation flow SHALL present existing Recruiting Cycles and the
Spring, Summer, Fall, and Winter cycles for 2027, 2028, and 2029 as selectable
options. It SHALL also permit entry of any valid Recruiting Cycle, including
one not already stored or suggested.

#### Scenario: A suggested Recruiting Cycle is selected

- **WHEN** a person selects one of the presented Recruiting Cycle options
- **THEN** the selected season and year are used for the Application

#### Scenario: An unsuggested Recruiting Cycle is entered

- **WHEN** a person enters a valid Recruiting Cycle that is neither stored nor
  among the suggested options
- **THEN** the system accepts the entry and uses it for the Application

### Requirement: Recruiting Cycle identity is resolved from manual entry

The system SHALL reuse an existing Recruiting Cycle with the entered season and
year, or create that Recruiting Cycle when none exists. The Application and
any newly created reusable records SHALL be persisted as one successful action
or none of them SHALL be persisted.

#### Scenario: Existing Recruiting Cycle is reused

- **WHEN** a person creates an Application using the season and year of an
  existing Recruiting Cycle
- **THEN** the new Application references the existing Recruiting Cycle

#### Scenario: Invalid Recruiting Cycle is rejected

- **WHEN** a person submits a Recruiting Cycle outside the supported seasons
  or year range
- **THEN** the system does not create an Application, Company, or Recruiting
  Cycle and shows a validation error

#### Scenario: Application creation fails after new identities are supplied

- **WHEN** any validation or persistence error prevents manual Application
  creation
- **THEN** the system does not leave a newly created Company or Recruiting
  Cycle behind
