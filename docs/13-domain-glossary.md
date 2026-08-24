# Glosarium dan Aturan Domain

Dokumen ini menetapkan bahasa bersama untuk product, design, engineering, analytics, dan QA. Istilah di UI boleh dilokalkan, tetapi makna domain tidak boleh berubah per fitur.

## Identity dan scope

- **Profile:** preferensi personal yang terkait satu identitas Supabase Auth; bukan tenant authorization.
- **Household:** batas tenant dan ruang data. Semua entity privat memiliki `household_id` langsung atau melalui parent yang tak ambigu.
- **Member:** user dengan membership aktif dan role. Membership yang revoked tidak memiliki akses meskipun pernah menyimpan cache.
- **Account:** tempat nilai dicatat: cash, bank, e-wallet, credit card, investment tracking, asset, atau liability. Account bukan credential/koneksi provider.
- **Account permission:** kemampuan seorang member atas account tertentu; UI visibility tidak menggantikan RLS.

## Ledger

- **Financial entry:** event keuangan ber-ID stabil yang menyimpan tanggal, status, currency context, note/merchant, source, dan version.
- **Entry split:** line yang mengalokasikan jumlah entry ke account/category/goal/debt. Jumlah split harus memenuhi invariant jenis entry.
- **Income:** nilai yang benar-benar menambah economic inflow household; transfer dari account sendiri bukan income.
- **Expense:** nilai yang benar-benar mengurangi economic resources untuk konsumsi/biaya; transfer dan principal debt reclassification mengikuti rule khusus.
- **Transfer:** perpindahan antara dua account milik pengguna/household. Dalam currency yang sama net effect cash flow adalah nol.
- **Adjustment:** koreksi balance dengan alasan eksplisit. Adjustment tidak disamarkan sebagai transaksi merchant.
- **Refund/reversal:** entry yang ditautkan ke entry asal; report dapat menetralkan category/periode sesuai kebijakan yang terdokumentasi.
- **Pending:** belum final/settled; dapat masuk forecast tetapi default tidak masuk reconciled balance.
- **Cleared:** dianggap posted/final oleh user atau provider.
- **Reviewed:** sudah dilihat dan diklasifikasi pengguna; bukan bukti cocok dengan statement.
- **Reconciled:** telah dicocokkan dengan closing balance/statement pada titik waktu tertentu.

## Organisasi dan perencanaan

- **Category:** klasifikasi tunggal utama untuk income/expense/transfer treatment; category dapat diarsipkan tetapi histori tetap ada.
- **Tag:** label many-to-many untuk dimensi tambahan; tag tidak menentukan cash-flow treatment.
- **Rule:** kondisi dan suggested action yang versioned. Rule otomatis berisiko tetap dapat direview/revert.
- **Budget:** rencana jumlah untuk periode/category/flex group; bukan pembatas account balance.
- **Rollover:** sisa/overspend yang dibawa sesuai policy dari satu periode ke berikutnya.
- **Goal:** target nilai dan tanggal; tidak selalu account terpisah.
- **Sinking fund:** goal berkala untuk pengeluaran yang diprediksi.
- **Recurring rule:** template jadwal; **occurrence** adalah instance terhitung. Template tidak otomatis menjadi ledger entry tanpa policy/confirmation.
- **Subscription:** recurring expense yang dapat dibuat manual atau dideteksi; “detected” selalu suggestion.
- **Debt/loan:** liability dengan principal, optional interest/fee, schedule, dan payment allocation; aplikasi melacak, tidak memberikan kredit.

## Nilai dan waktu

- **Balance:** hasil ledger pada account dan cutoff tertentu; `current`, `available`, dan `reconciled` harus diberi label berbeda.
- **Cash flow:** income minus expense dalam periode; transfer dikecualikan.
- **Net worth:** authorized assets minus liabilities pada cutoff, dikonversi ke base currency dengan rate provenance.
- **Original currency/amount:** nilai yang terjadi dan tidak berubah setelah posting.
- **Settlement currency/amount:** nilai yang benar-benar mengenai account, jika berbeda.
- **Base currency:** mata uang presentasi household; perubahan base tidak menulis ulang nilai asli.
- **Exchange rate:** decimal quote dengan source dan timestamp; nilai hilang tidak boleh diasumsikan 1:1.
- **Timestamp:** instant UTC untuk event; **household timezone** menentukan hari/periode/recurrence. Date-only disimpan terpisah agar tidak bergeser.

## Capture, attachment, dan intelligence

- **Attachment:** object privat (misalnya foto struk) dengan metadata, ownership, hash, retention, dan RLS.
- **Receipt extraction:** hasil OCR/parse beserta confidence/provenance; bukan financial entry sampai dikonfirmasi.
- **Voice draft:** transcript/session dan parsed fields sementara; raw audio tidak disimpan default.
- **Suggested field:** nilai dari OCR/voice/rule/AI/provider yang belum diakui pengguna atau policy terpercaya.
- **AI insight:** narasi atas facts deterministik; bukan nasihat keuangan atau calculation authority.
- **Financial connection:** referensi server-side ke consent/provider read-only; bukan account dan tidak menyimpan credential bank di client.

## Sync dan lifecycle

- **Idempotency key:** ID unik mutation; pengulangan payload sama menghasilkan satu efek, payload berbeda dengan ID sama ditolak.
- **Version:** angka server yang berubah pada update dan dipakai untuk optimistic concurrency.
- **Outbox:** mutation local yang sudah durable tetapi belum diakui server.
- **Sync cursor:** posisi monotonic server untuk delta pull; waktu device tidak menjadi cursor.
- **Conflict:** local dan server mengubah field yang overlap dari base version sama; finance-critical conflict memerlukan review.
- **Tombstone:** marker delete tersinkron yang dipertahankan cukup lama agar device offline tidak menghidupkan data kembali.
- **Archive:** entity tidak tersedia untuk pilihan baru tetapi histori dipertahankan.
- **Soft delete:** data disembunyikan selama grace/recovery window sebelum purge.
- **Purge:** penghapusan aktif yang tidak dapat dipulihkan melalui UI; backup expiry dijelaskan terpisah.

## Invariants wajib

1. Tidak ada persisted money berbasis floating-point.
2. Setiap read/write privat membuktikan membership dan resource permission di server.
3. Transfer currency sama net-zero dan tidak masuk income/expense.
4. OCR, voice, AI, dan fuzzy dedupe tidak mengubah ledger tanpa confirmation/policy eksplisit dan reversible.
5. Local “tersimpan” berarti entity+outbox sudah committed dalam encrypted database.
6. Retry tidak membuat efek ganda; conflict tidak menghapus perubahan diam-diam.
7. Report/cache dapat direkalkulasi dari ledger source of truth.
8. Native/config change selalu menghasilkan runtime/binary baru, bukan OTA-only.

