# Security Specification: Teacher Question Bank & Freeze & Win Game

## 1. Data Invariants
1. **User Profiles (`/users/{userId}`)**:
   - A user profile can only be read, created, or updated by the authenticated user whose `request.auth.uid == userId`.
   - No public user profile browsing is permitted to safeguard teacher emails.
2. **Question Sets (`/questionSets/{questionSetId}`)**:
   - Every question set must be explicitly bound to an `ownerId`.
   - When created or updated, `incoming().ownerId` must strictly match `request.auth.uid`.
   - Only the owner (`ownerId == request.auth.uid`) can update or delete their question set.
   - Any user (even unauthenticated students) can read a question set if `visibility in ['public', 'shared']`.
   - Authenticated teachers can list their own sets (`ownerId == request.auth.uid`) or browse sets where `visibility == 'public'`.
   - Teacher B cannot mutate Teacher A's set; copying a set creates an independent document with `ownerId == Teacher B UID`.
3. **Questions (`/questions/{questionId}`)**:
   - Each question document is strictly linked to a valid `questionSetId` and inherits access rights.
   - For fast, secure listing and deletion, `ownerId` is also mirrored on the question and must equal `request.auth.uid` on write.
   - Unauthenticated students can read questions belonging to sets where `visibility in ['public', 'shared']`.

## 2. The Dirty Dozen Payloads (Targeted Malicious Payloads Blocked by Rules)
1. **Unauthenticated Profile Injection**: Anonymous write to `/users/spoofed_uid` -> Denied.
2. **Profile Cross-User Snooping**: Authenticated User A reading `/users/UserB` -> Denied.
3. **Question Set Ownership Hijacking**: User B attempting `update` on `/questionSets/SetA` -> Denied (`resource.data.ownerId != request.auth.uid`).
4. **Owner Id Spoofing on Create**: User B setting `ownerId: "TeacherA"` on a new set -> Denied (`incoming().ownerId != request.auth.uid`).
5. **Deleting Other Teacher's Set**: User B deleting `/questionSets/SetA` -> Denied.
6. **Private Set Scraping**: Anonymous user listing `/questionSets` where `visibility == 'private'` -> Denied.
7. **Unauthenticated Question Mutation**: Guest attempting to insert a question into `/questions` -> Denied (`request.auth == null`).
8. **Tampering with Other Teacher's Questions**: User B trying to update questions with `ownerId: "TeacherA"` -> Denied.
9. **Oversized String Injection Attack**: Submitting 500KB string for `title` or `question` -> Denied by `.size() <= MAX` bounds.
10. **Corrupted Visibility Value**: Setting `visibility: 'super_admin_secret'` -> Denied by enum validation.
11. **Negative Points Injection**: Attempting to set negative points or non-numeric points -> Denied by type & range check.
12. **Id Poisoning**: Passing 2KB non-alphanumeric string as document ID -> Denied by `isValidId(id)`.
