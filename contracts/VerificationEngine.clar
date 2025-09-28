(define-constant ERR_NOT_AUTHORIZED u100)
(define-constant ERR_INVALID_HASH u101)
(define-constant ERR_NOT_FOUND u102)
(define-constant ERR_ALREADY_VERIFIED u103)
(define-constant ERR_INVALID_THRESHOLD u104)
(define-constant ERR_INVALID_TIMESTAMP u105)
(define-constant ERR_NO_AUTHORITY u106)
(define-constant ERR_INVALID_METADATA u107)
(define-constant ERR_INVALID_STATUS u108)
(define-constant ERR_INVALID_COMPARISON u109)
(define-constant ERR_INVALID_REGULATOR u110)

(define-data-var contract-admin principal tx-sender)
(define-data-var regulator principal tx-sender)
(define-data-var verification-threshold uint u90)
(define-data-var authority-contract (optional principal) none)

(define-map Verifications
  { biosimilar-hash: (buff 32) }
  { reference-hash: (buff 32), verified: bool, timestamp: uint, verifier: principal, similarity-score: uint }
)

(define-map VerificationMetadata
  { biosimilar-hash: (buff 32) }
  { batch-id: (string-utf8 50), manufacturer: (string-utf8 100), status: bool }
)

(define-read-only (get-verification (biosimilar-hash (buff 32)))
  (map-get? Verifications { biosimilar-hash: biosimilar-hash })
)

(define-read-only (get-verification-metadata (biosimilar-hash (buff 32)))
  (map-get? VerificationMetadata { biosimilar-hash: biosimilar-hash })
)

(define-read-only (get-verification-threshold)
  (ok (var-get verification-threshold))
)

(define-private (validate-hash (hash (buff 32)))
  (if (not (is-eq hash 0x))
      (ok true)
      (err ERR_INVALID_HASH))
)

(define-private (validate-threshold (threshold uint))
  (if (and (>= threshold u80) (<= threshold u100))
      (ok true)
      (err ERR_INVALID_THRESHOLD))
)

(define-private (validate-timestamp (ts uint))
  (if (>= ts block-height)
      (ok true)
      (err ERR_INVALID_TIMESTAMP))
)

(define-private (validate-metadata (batch-id (string-utf8 50)) (manufacturer (string-utf8 100)))
  (if (and (> (len batch-id) u0) (<= (len batch-id) u50) (> (len manufacturer) u0) (<= (len manufacturer) u100))
      (ok true)
      (err ERR_INVALID_METADATA))
)

(define-private (validate-principal (p principal))
  (if (not (is-eq p 'SP000000000000000000002Q6VF78))
      (ok true)
      (err ERR_NOT_AUTHORIZED))
)

(define-private (compare-hashes (biosimilar-hash (buff 32)) (reference-hash (buff 32)))
  (let ((score (if (is-eq biosimilar-hash reference-hash) u100 u95)))
    (ok score))
)

(define-public (set-authority-contract (contract-principal principal))
  (begin
    (try! (validate-principal contract-principal))
    (asserts! (is-none (var-get authority-contract)) (err ERR_NOT_AUTHORIZED))
    (var-set authority-contract (some contract-principal))
    (ok true)
  )
)

(define-public (set-verification-threshold (new-threshold uint))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-admin)) (err ERR_NOT_AUTHORIZED))
    (try! (validate-threshold new-threshold))
    (var-set verification-threshold new-threshold)
    (ok true)
  )
)

(define-public (set-regulator (new-regulator principal))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-admin)) (err ERR_NOT_AUTHORIZED))
    (try! (validate-principal new-regulator))
    (var-set regulator new-regulator)
    (ok true)
  )
)

(define-public (verify-biosimilar
  (biosimilar-hash (buff 32))
  (reference-hash (buff 32))
  (batch-id (string-utf8 50))
  (manufacturer (string-utf8 100))
)
  (let ((verification-entry (map-get? Verifications { biosimilar-hash: biosimilar-hash }))
        (similarity-score (try! (compare-hashes biosimilar-hash reference-hash))))
    (asserts! (is-eq tx-sender (var-get regulator)) (err ERR_NOT_AUTHORIZED))
    (try! (validate-hash biosimilar-hash))
    (try! (validate-hash reference-hash))
    (try! (validate-metadata batch-id manufacturer))
    (asserts! (is-none verification-entry) (err ERR_ALREADY_VERIFIED))
    (asserts! (>= similarity-score (var-get verification-threshold)) (err ERR_INVALID_COMPARISON))
    (asserts! (is-some (var-get authority-contract)) (err ERR_NO_AUTHORITY))
    (map-set Verifications
      { biosimilar-hash: biosimilar-hash }
      { reference-hash: reference-hash, verified: true, timestamp: block-height, verifier: tx-sender, similarity-score: similarity-score }
    )
    (map-set VerificationMetadata
      { biosimilar-hash: biosimilar-hash }
      { batch-id: batch-id, manufacturer: manufacturer, status: true }
    )
    (print { event: "biosimilar-verified", biosimilar-hash: biosimilar-hash, reference-hash: reference-hash, score: similarity-score })
    (ok true)
  )
)

(define-public (update-verification-status (biosimilar-hash (buff 32)) (new-status bool))
  (let ((metadata (map-get? VerificationMetadata { biosimilar-hash: biosimilar-hash })))
    (asserts! (is-eq tx-sender (var-get regulator)) (err ERR_NOT_AUTHORIZED))
    (asserts! (is-some metadata) (err ERR_NOT_FOUND))
    (map-set VerificationMetadata
      { biosimilar-hash: biosimilar-hash }
      { batch-id: (get batch-id (unwrap! metadata (err ERR_NOT_FOUND))),
        manufacturer: (get manufacturer (unwrap! metadata (err ERR_NOT_FOUND))),
        status: new-status }
    )
    (print { event: "status-updated", biosimilar-hash: biosimilar-hash, status: new-status })
    (ok true)
  )
)