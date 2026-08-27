// Drives the WASM send_funds export down the HF21 "deploy a new asset" path, to
// check the JS-facing bridge layer: descriptor parsing, validation, token id
// derivation, and that the controller actually starts.
//
//   node tests/deployNewAsset.node.js <path-to-built>/BeldexLibAppCpp_WASM.js
//
// It stops at the balance fetch, since going further needs a light-wallet
// server. The construction that happens after that point is covered by
// beldex-core-cpp's tests/token_deploy_test.cpp, which builds a real deploy
// transaction and inspects it.
// Resolved against the working directory rather than this file, so a path typed
// at the shell means what it looks like.
const modPath = require("path").resolve(process.cwd(), process.argv[2]);
require(modPath)().then(function (M) {
  let fails = 0;
  const check = (n, c, e) => { if (c) console.log("  PASS  " + n); else { console.log("  FAIL  " + n + (e ? "  " + e : "")); fails++; } };
  const J = (s) => JSON.parse(s);

  const w = J(M.newly_created_wallet("en-US", "MAINNET"));

  let lastError = null, unspentReq = null;
  M.fromCpp__SendFundsFormSubmission__error = (p) => { lastError = p; };
  M.fromCpp__SendFundsFormSubmission__status_update = () => {};
  M.fromCpp__SendFundsFormSubmission__willBeginSending = () => {};
  M.fromCpp__SendFundsFormSubmission__canceled = () => {};
  M.fromCpp__SendFundsFormSubmission__success = () => {};
  M.fromCpp__SendFundsFormSubmission__authenticate = () => {};
  M.fromCpp__SendFundsFormSubmission__get_unspent_outs = (p) => { unspentReq = p; };
  M.fromCpp__SendFundsFormSubmission__get_random_outs = () => {};
  M.fromCpp__SendFundsFormSubmission__submit_raw_tx = () => {};

  const base = (descriptor, extra) => Object.assign({
    isRegisterStr: false,
    is_deploy_token: true,
    token_descriptor: descriptor,
    fromWallet_didFailToInitialize: false,
    fromWallet_didFailToBoot: false,
    fromWallet_needsImport: false,
    requireAuthentication: false,
    is_sweeping: false,
    priority: "1",
    hasPickedAContact: false,
    nettype_string: "MAINNET",
    from_address_string: w.address,
    sec_viewKey_string: w.privateViewKey,
    sec_spendKey_string: w.privateSpendKey,
    pub_spendKey_string: w.publicSpendKey,
    destinations: [],
    resolvedAddress_fieldIsVisible: false,
    manuallyEnteredPaymentID_fieldIsVisible: false,
    resolvedPaymentID_fieldIsVisible: false,
  }, extra || {});

  const good = { ticker: "DEMO", full_name: "Demo Token", decimal_point: "8",
                 total_max_supply: "1000000", current_supply: "1000", meta_info: "" };

  const run = (json) => { lastError = null; unspentReq = null; M.send_funds(JSON.stringify(json)); };

  // Happy path: reaches the balance fetch, which is as far as it can get
  // without a light-wallet server behind it.
  run(base(good));
  check("valid descriptor starts the send", unspentReq !== null && lastError === null,
        lastError ? JSON.stringify(lastError) : "");
  check("balance is fetched for the deploying wallet", unspentReq && unspentReq.address === w.address);

  // Validation. Each of these must come back as an error rather than building
  // a transaction the daemon would reject.
  const bad = [
    ["ticker with a space", Object.assign({}, good, { ticker: "DE MO" })],
    ["ticker too long", Object.assign({}, good, { ticker: "ABCDEFGHIJKLMNO" })],
    ["empty ticker", Object.assign({}, good, { ticker: "" })],
    ["decimal_point over 18", Object.assign({}, good, { decimal_point: "19" })],
    ["supply over the cap", Object.assign({}, good, { current_supply: "2000000" })],
    ["unparseable supply", Object.assign({}, good, { current_supply: "abc" })],
  ];
  for (const [name, d] of bad) {
    run(base(d));
    check("rejected: " + name, lastError !== null && unspentReq === null,
          lastError === null ? "no error reported" : "");
  }

  run(base(good, { priority: "5" }));
  check("rejected: flash priority", lastError !== null && unspentReq === null);

  // A missing descriptor must be reported, not crash.
  const noDesc = base(good); delete noDesc.token_descriptor;
  run(noDesc);
  check("rejected: missing token_descriptor", lastError !== null && unspentReq === null);

  // And an ordinary BDX send is still an ordinary BDX send.
  run(base(good, { is_deploy_token: false, destinations: [{ to_address: w.address, send_amount: "1.5" }] }));
  check("ordinary BDX send is unaffected", unspentReq !== null && lastError === null,
        lastError ? JSON.stringify(lastError) : "");

  console.log(fails ? "\nFAILURES: " + fails : "\nALL PASSED (failures: 0)");
  process.exit(fails ? 1 : 0);
}).catch(e => { console.error("load/exec error:", e); process.exit(1); });
