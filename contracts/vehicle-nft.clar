;; Vehicle NFT Contract
;; Clarity v2
;; Manages vehicle NFTs with immutable metadata for provenance tracking in AutoLedger

;; Error codes
(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-PAUSED u101)
(define-constant ERR-ZERO-ADDRESS u102)
(define-constant ERR-NFT-EXISTS u103)
(define-constant ERR-NFT-NOT-FOUND u104)
(define-constant ERR-INVALID-METADATA u105)
(define-constant ERR-UNAUTHORIZED-UPDATE u106)
(define-constant ERR-INVALID-MILEAGE u107)

;; NFT metadata structure
(define-data-var token-id-counter uint u0)
(define-data-var admin principal tx-sender)
(define-data-var oracle principal tx-sender)
(define-data-var paused bool false)

;; Map to store vehicle NFT metadata
(define-map vehicle-nfts
  { token-id: uint }
  {
    vin: (string-ascii 17),
    make: (string-ascii 50),
    model: (string-ascii 50),
    year: uint,
    mileage: uint,
    owner: principal,
    created-at: uint,
    last-updated: uint
  }
)

;; Map to track token ownership
(define-map token-owners { token-id: uint } { owner: principal })

;; Map to store approved operators for transfers
(define-map approved-operators { token-id: uint, operator: principal } { approved: bool })

;; Event logging for transparency
(define-data-var event-counter uint u0)
(define-map events
  { event-id: uint }
  {
    token-id: uint,
    event-type: (string-ascii 20),
    initiator: principal,
    timestamp: uint,
    details: (string-ascii 100)
  })

;; Private helper: is-admin-or-oracle
(define-private (is-admin-or-oracle)
  (or (is-eq tx-sender (var-get admin)) (is-eq tx-sender (var-get oracle)))
)

;; Private helper: ensure not paused
(define-private (ensure-not-paused)
  (asserts! (not (var-get paused)) (err ERR-PAUSED))
)

;; Private helper: log event
(define-private (log-event (token-id uint) (event-type (string-ascii 20)) (details (string-ascii 100)))
  (let ((event-id (var-get event-counter)))
    (map-set events
      { event-id: event-id }
      {
        token-id: token-id,
        event-type: event-type,
        initiator: tx-sender,
        timestamp: block-height,
        details: details
      }
    )
    (var-set event-counter (+ event-id u1))
    (ok true)
  )
)

;; Admin: Set new admin
(define-public (set-admin (new-admin principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err ERR-NOT-AUTHORIZED))
    (asserts! (not (is-eq new-admin 'SP000000000000000000002Q6VF78)) (err ERR-ZERO-ADDRESS))
    (var-set admin new-admin)
    (ok true)
  )
)

;; Admin: Set oracle
(define-public (set-oracle (new-oracle principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err ERR-NOT-AUTHORIZED))
    (asserts! (not (is-eq new-oracle 'SP000000000000000000002Q6VF78)) (err ERR-ZERO-ADDRESS))
    (var-set oracle new-oracle)
    (ok true)
  )
)

;; Admin: Pause/unpause contract
(define-public (set-paused (pause bool))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err ERR-NOT-AUTHORIZED))
    (var-set paused pause)
    (ok pause)
  )
)

;; Mint a new vehicle NFT
(define-public (mint-nft
  (vin (string-ascii 17))
  (make (string-ascii 50))
  (model (string-ascii 50))
  (year uint)
  (mileage uint)
  (recipient principal))
  (begin
    (asserts! (is-admin-or-oracle) (err ERR-NOT-AUTHORIZED))
    (ensure-not-paused)
    (asserts! (not (is-eq recipient 'SP000000000000000000002Q6VF78)) (err ERR-ZERO-ADDRESS))
    (asserts! (> (len vin) u0) (err ERR-INVALID-METADATA))
    (asserts! (> (len make) u0) (err ERR-INVALID-METADATA))
    (asserts! (> (len model) u0) (err ERR-INVALID-METADATA))
    (asserts! (> year u1900) (err ERR-INVALID-METADATA))
    (let ((token-id (var-get token-id-counter)))
      (asserts! (is-none (map-get? vehicle-nfts { token-id: token-id })) (err ERR-NFT-EXISTS))
      (map-set vehicle-nfts
        { token-id: token-id }
        {
          vin: vin,
          make: make,
          model: model,
          year: year,
          mileage: mileage,
          owner: recipient,
          created-at: block-height,
          last-updated: block-height
        }
      )
      (map-set token-owners { token-id: token-id } { owner: recipient })
      (var-set token-id-counter (+ token-id u1))
      (log-event token-id "MINT" (concat "Minted to " (principal-to-string recipient)))
      (ok token-id)
    )
  )
)

;; Update NFT metadata (oracle or admin only)
(define-public (update-metadata
  (token-id uint)
  (mileage uint)
  (new-vin (optional (string-ascii 17)))
  (new-make (optional (string-ascii 50)))
  (new-model (optional (string-ascii 50)))
  (new-year (optional uint)))
  (begin
    (asserts! (is-admin-or-oracle) (err ERR-NOT-AUTHORIZED))
    (ensure-not-paused)
    (asserts! (>= mileage u0) (err ERR-INVALID-MILEAGE))
    (let ((nft-data (unwrap! (map-get? vehicle-nfts { token-id: token-id }) (err ERR-NFT-NOT-FOUND))))
      (map-set vehicle-nfts
        { token-id: token-id }
        {
          vin: (default-to (get vin nft-data) new-vin),
          make: (default-to (get make nft-data) new-make),
          model: (default-to (get model nft-data) new-model),
          year: (default-to (get year nft-data) new-year),
          mileage: mileage,
          owner: (get owner nft-data),
          created-at: (get created-at nft-data),
          last-updated: block-height
        }
      )
      (log-event token-id "UPDATE_METADATA" "Updated vehicle metadata")
      (ok true)
    )
  )
)

;; Transfer NFT
(define-public (transfer-nft (token-id uint) (recipient principal))
  (begin
    (ensure-not-paused)
    (asserts! (not (is-eq recipient 'SP000000000000000000002Q6VF78)) (err ERR-ZERO-ADDRESS))
    (let ((nft-data (unwrap! (map-get? vehicle-nfts { token-id: token-id }) (err ERR-NFT-NOT-FOUND)))
          (owner-data (unwrap! (map-get? token-owners { token-id: token-id }) (err ERR-NFT-NOT-FOUND))))
      (asserts!
        (or
          (is-eq tx-sender (get owner nft-data))
          (is-eq (get approved (default-to { approved: false } (map-get? approved-operators { token-id: token-id, operator: tx-sender }))) true)
        )
        (err ERR-NOT-AUTHORIZED)
      )
      (map-set vehicle-nfts
        { token-id: token-id }
        (merge nft-data { owner: recipient, last-updated: block-height })
      )
      (map-set token-owners { token-id: token-id } { owner: recipient })
      (map-delete approved-operators { token-id: token-id, operator: tx-sender })
      (log-event token-id "TRANSFER" (concat "Transferred to " (principal-to-string recipient)))
      (ok true)
    )
  )
)

;; Approve an operator for NFT transfer
(define-public (approve-operator (token-id uint) (operator principal))
  (begin
    (ensure-not-paused)
    (asserts! (not (is-eq operator 'SP000000000000000000002Q6VF78)) (err ERR-ZERO-ADDRESS))
    (let ((nft-data (unwrap! (map-get? vehicle-nfts { token-id: token-id }) (err ERR-NFT-NOT-FOUND))))
      (asserts! (is-eq tx-sender (get owner nft-data)) (err ERR-NOT-AUTHORIZED))
      (map-set approved-operators { token-id: token-id, operator: operator } { approved: true })
      (log-event token-id "APPROVE" (concat "Approved operator " (principal-to-string operator)))
      (ok true)
    )
  )
)

;; Revoke operator approval
(define-public (revoke-operator (token-id uint) (operator principal))
  (begin
    (ensure-not-paused)
    (let ((nft-data (unwrap! (map-get? vehicle-nfts { token-id: token-id }) (err ERR-NFT-NOT-FOUND))))
      (asserts! (is-eq tx-sender (get owner nft-data)) (err ERR-NOT-AUTHORIZED))
      (map-delete approved-operators { token-id: token-id, operator: operator })
      (log-event token-id "REVOKE" (concat "Revoked operator " (principal-to-string operator)))
      (ok true)
    )
  )
)

;; Read-only: Get NFT metadata
(define-read-only (get-nft-metadata (token-id uint))
  (ok (map-get? vehicle-nfts { token-id: token-id }))
)

;; Read-only: Get owner
(define-read-only (get-owner (token-id uint))
  (ok (map-get? token-owners { token-id: token-id }))
)

;; Read-only: Get admin
(define-read-only (get-admin)
  (ok (var-get admin))
)

;; Read-only: Get oracle
(define-read-only (get-oracle)
  (ok (var-get oracle))
)

;; Read-only: Is paused
(define-read-only (is-paused)
  (ok (var-get paused))
)

;; Read-only: Get event
(define-read-only (get-event (event-id uint))
  (ok (map-get? events { event-id: event-id }))
)

;; Read-only: Get token ID counter
(define-read-only (get-token-id-counter)
  (ok (var-get token-id-counter))
)