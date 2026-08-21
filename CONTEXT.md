# Job Tracking

This context records a person's job-search and internship recruiting activity. It preserves a manual record of job submissions and the recruiting activity associated with them.

## Recruiting Records

**Recruiting Cycle**:
A season and year for the term in which a role is performed, such as Fall 2027 or Summer 2027. An Application belongs to one Recruiting Cycle regardless of when its events occur.
_Avoid_: Season, application cycle

**Application**:
One person's submission for one specific role at one Company. An owner cannot have more than one Application with the same Company, role title, and Recruiting Cycle; an Application can be marked as referred or not referred.
_Avoid_: Opportunity, job, candidacy

**Company**:
A reusable identity for an organization to which Applications can be submitted. Multiple Applications may refer to the same Company, and a Company has one manually maintained candidate-portal URL.
_Avoid_: Employer, organization

**Application Event**:
A dated occurrence in an Application's recruiting process, such as submission, assessment, interview, offer, or decision. Assessments and interviews use separate scheduled and completed events; its type and optional interview-round label identify the kind of occurrence, and it may contain notes. Events use a date, and scheduled interviews additionally have a local time.
_Avoid_: Status update, timeline item

**Event Occurrence Date**:
The date on which an Application Event happened. It is distinct from the automatic date on which the tracker recorded the event.
_Avoid_: Created date, sync date

**Current Status**:
The current stage of an Application, derived from the latest status-changing Application Event. The canonical statuses are Applied, Assessment pending, Awaiting response, Interviewing, Offer accepted, Offer declined, Rejected, and Withdrawn; it is not independently maintained.
_Avoid_: Status field, status override

**Application Completion**:
The derived grouping that identifies an Application as active or completed. Rejected, withdrawn, accepted-offer, and declined-offer outcomes complete an Application.
_Avoid_: Status, done

**Application Notes**:
Free-text context attached to an Application as a whole, rather than to one specific Application Event.
_Avoid_: Event notes, stage notes

**Inbox Item**:
A proposed Application change or creation extracted from a recruiting-related email, awaiting a person's review. A model may suggest every proposed field, including Recruiting Cycle and Application match, but a person can edit, accept, or dismiss it before it affects tracked Applications. One source email produces one Inbox Item that proposes one action.
_Avoid_: Automatic update, synced application

**Inbox History**:
The retained, non-active Inbox Items that have been accepted or dismissed. It indicates whether a person edited an Inbox Item before accepting it.
_Avoid_: Archive, email history

**Inbox Badge**:
The count displayed beside Inbox navigation that identifies active Inbox Items awaiting review.
_Avoid_: Notification count, unread mail count

**Dashboard**:
The primary table of every Application, ordered by submission date. It can filter Applications by Recruiting Cycle, Current Status, Application Completion, and other tracked attributes.
_Avoid_: Active-applications view

**Application Detail Dialog**:
The editable detailed view of one Application, opened from its Dashboard row. It contains the Application's fields, notes, and Application Event timeline.
_Avoid_: Application page, row expansion

**Deletion**:
The confirmed permanent removal of an Application and its Application Events, or of an individual Application Event. Deletion has no v1 undo or trash state.
_Avoid_: Archive, soft delete

**Accepted Inbox Provenance**:
The internal association from an Application or Application Event created through Inbox review to its accepted Inbox Item and source Gmail message. It supports traceability and duplicate handling without retaining email content.
_Avoid_: Gmail link, email archive

**Connected Gmail Account**:
The single Gmail account from which a person permits the tracker to read emails for recruiting information. The tracker does not send, modify, label, or delete messages in this account.
_Avoid_: Mailbox, email account

**Gmail Sync Window**:
The inclusive period selected in Settings in which the tracker examines a Connected Gmail Account's messages. An initial sync uses a person-selected start and end date; later startup syncs use the last successful sync timestamp through the present. Previously processed message IDs are not reconsidered.
_Avoid_: Full sync, polling window

**Sync Activity**:
A durable record of one Gmail sync's progress and result, including scanned-message and created-Inbox-Item counts or a failure explanation. Initial-range sync shows its processing progress in Settings.
_Avoid_: Mailbox notification, sync toast

**Data Export**:
A user-requested flat CSV download that repeats Application fields for each Application Event, for portability, backup, or external analysis.
_Avoid_: Spreadsheet migration, analytics

**Ollama Model**:
The fixed local `llama3.2:3b` model that interprets recruiting emails during Gmail synchronization. Its model identifier is a code-level choice rather than a user setting.
_Avoid_: Configurable model, cloud AI

**Gmail Sync Failure**:
A failed Gmail synchronization. If Ollama is unavailable before synchronization begins, it creates no Inbox Items and marks no Gmail messages as processed; a later operational failure preserves successfully processed messages and reports a partial result.
_Avoid_: Silent failure
