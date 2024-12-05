sequenceDiagram
    participant Editor
    participant Policy
    participant Author
    participant Article
    participant Researcher
    participant Reference
    participant Reviewer

    Note over Editor,Policy: Policy Creation & Management
    Editor->>Policy: Create/Update/Retire Policy
    
    Note over Author,Policy: Article Proposal Phase
    Author->>Policy: View Available Policies
    Author->>Policy: Submit Coverage Proposal
    Editor->>Policy: Review Proposals
    Editor->>Author: Approve/Reject Proposal
    
    Note over Author,Article: Article Creation Phase
    Author->>Article: Create Article Draft
    Author->>Article: Submit for Research
    
    Note over Researcher,Reference: Research Phase
    Researcher->>Article: Pick from Research Queue
    Researcher->>Reference: Add/Verify References
    Researcher->>Article: Submit Research
    
    Note over Reviewer,Article: Review Phase
    Reviewer->>Article: Pick from Review Queue
    Reviewer->>Article: Review Content
    alt Approved Review
        Reviewer->>Article: Mark Review Complete
        Article->>Editor: Move to Publishing Queue
        Editor->>Article: Final Review & Publish
        Article->>Policy: Link Published Article
    else Needs Revision
        Reviewer->>Author: Request Revisions
        Author->>Article: Update Article
        Author->>Article: Resubmit for Review
    end