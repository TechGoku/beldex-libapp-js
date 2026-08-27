// Copyright (c) 2014-2019, MyMonero.com
// Copyright (c)      2023, The Beldex Project
// All rights reserved.
//
// Redistribution and use in source and binary forms, with or without modification, are
// permitted provided that the following conditions are met:
//
// 1. Redistributions of source code must retain the above copyright notice, this list of
//	conditions and the following disclaimer.
//
// 2. Redistributions in binary form must reproduce the above copyright notice, this list
//	of conditions and the following disclaimer in the documentation and/or other
//	materials provided with the distribution.
//
// 3. Neither the name of the copyright holder nor the names of its contributors may be
//	used to endorse or promote products derived from this software without specific
//	prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY
// EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
// MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL
// THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
// SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
// PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
// INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT,
// STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF
// THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
const MyMoneroCoreBridgeEssentialsClass = require('../mymonero-core-js/monero_utils/MyMoneroCoreBridgeEssentialsClass')
const MyMoneroBridge_utils = require('../mymonero-core-js/monero_utils/MyMoneroBridge_utils')
const nettype_utils = require("../mymonero-core-js/cryptonote_utils/nettype");
//
class BeldexLibAppBridgeClass extends MyMoneroCoreBridgeEssentialsClass
{
	constructor(this_Module)
	{
		super(this_Module)
		//
		const self = this
		self._register_async_cb_fns__SendFundsFormSubmission()
	}
	//
	// SendFundsFormSubmissionController
	_register_async_cb_fns__SendFundsFormSubmission()
	{
		const self = this
		self.Module.fromCpp__SendFundsFormSubmission__get_unspent_outs = function(req_params)
		{
			self._cb_handlers__SendFundsFormSubmission["fromCpp__SendFundsFormSubmission__get_unspent_outs"](req_params);
		};
		self.Module.fromCpp__SendFundsFormSubmission__get_random_outs = function(req_params)
		{
			self._cb_handlers__SendFundsFormSubmission["fromCpp__SendFundsFormSubmission__get_random_outs"](req_params);
		};
		self.Module.fromCpp__SendFundsFormSubmission__submit_raw_tx = function(req_params)
		{
			self._cb_handlers__SendFundsFormSubmission["fromCpp__SendFundsFormSubmission__submit_raw_tx"](req_params);
		};
		self.Module.fromCpp__SendFundsFormSubmission__status_update = function(params)
		{
			self._cb_handlers__SendFundsFormSubmission["fromCpp__SendFundsFormSubmission__status_update"](params);
		};
		self.Module.fromCpp__SendFundsFormSubmission__error = function(params)
		{
			self._cb_handlers__SendFundsFormSubmission["fromCpp__SendFundsFormSubmission__error"](params);
		};
		self.Module.fromCpp__SendFundsFormSubmission__success = function(params)
		{
			self._cb_handlers__SendFundsFormSubmission["fromCpp__SendFundsFormSubmission__success"](params);
		};
		self.Module.fromCpp__SendFundsFormSubmission__willBeginSending = function()
		{
			self._cb_handlers__SendFundsFormSubmission["fromCpp__SendFundsFormSubmission__willBeginSending"]();
		}
		self.Module.fromCpp__SendFundsFormSubmission__canceled = function()
		{
			self._cb_handlers__SendFundsFormSubmission["fromCpp__SendFundsFormSubmission__canceled"]();
		}
		self.Module.fromCpp__SendFundsFormSubmission__authenticate = function()
		{
			self._cb_handlers__SendFundsFormSubmission["fromCpp__SendFundsFormSubmission__authenticate"]();
		}
	}
	// HF22: what a private-token registration costs and requires, as protocol
	// constants. Call this before offering registration in a UI: it is how the
	// app learns that 10,000 BDX will be locked, for how long, and what the
	// descriptor limits are, instead of discovering all of it from a failed
	// send. Amounts come back as strings in atomic units -- 10,000 BDX exceeds
	// what a JS number holds safely, so parse with BigInt if you do arithmetic.
	//
	// Returns:
	//   { collateral_amount, collateral_lock_blocks, min_token_outputs,
	//     min_fork_version, max_ticker_length, max_full_name_length,
	//     max_decimal_point }
	tokenRegistrationInfo()
	{
		return JSON.parse(this.Module.token_registration_info());
	}
	// Convenience for the common UI question: can this wallet afford to register
	// a token right now? `unlockedBalance` is atomic units, as a string or
	// BigInt. Deliberately excludes the network fee, which is not known until
	// the inputs are chosen -- so treat a true here as necessary, not
	// sufficient, and let the send report the exact shortfall.
	canAffordTokenRegistration(unlockedBalance)
	{
		const info = this.tokenRegistrationInfo();
		return BigInt(unlockedBalance) >= BigInt(info.collateral_amount);
	}
	__new_cb_args_with_no_task_id(err_msg, res)
	{
		const args = {};
		if (typeof err_msg !== 'undefined' && err_msg) {
			args.err_msg = err_msg; // errors must be sent back so that C++ can free heap vals container
		} else {
			args.res = res;
		}
		return args;
	}
	async__send_funds(fn_args)
	{
		const self = this;
		// register cb handler fns to wait for calls with thi task id
		if (typeof self._cb_handlers__SendFundsFormSubmission !== 'undefined' && self._cb_handlers__SendFundsFormSubmission != null) {
			throw "Expected self._cb_handlers__SendFundsFormSubmission - send-funds must already be in progress - this should be disallowed in the UI"
		}
		const errHandler_fn = function(params)
		{
			if (typeof params.err_code !== 'undefined' && params.err_code !== null) { // this can be nil in case of a server error
				params.err_code = parseInt(""+params.err_code)
			}
			if (typeof params.createTx_errCode !== 'undefined' && params.createTx_errCode !== null) {
				params.createTx_errCode = parseInt(""+params.createTx_errCode)
			}
			fn_args.error_fn(params);
			self._cb_handlers__SendFundsFormSubmission = null // reset so we can enter process again
		};
		self._cb_handlers__SendFundsFormSubmission = {}
		self._cb_handlers__SendFundsFormSubmission["fromCpp__SendFundsFormSubmission__get_unspent_outs"] = function(req_params)
		{
			// convert bridge-strings to native primitive types
			req_params.use_dust = MyMoneroBridge_utils.ret_val_boolstring_to_bool(req_params.use_dust)
			req_params.mixin = parseInt(req_params.mixin)
			//
			fn_args.get_unspent_outs_fn(req_params, function(err_msg, res)
			{
				const args = self.__new_cb_args_with_no_task_id(err_msg, res);
				const ret_string = self.Module.send_cb_I__got_unspent_outs(JSON.stringify(args))
				const ret = JSON.parse(ret_string);
				if (typeof ret.err_msg !== 'undefined' && ret.err_msg) { // this is actually an exception
					errHandler_fn({ 
						err_msg: ret.err_msg 
					});
					// ^-- this will clean up cb handlers too
					return;
				} else {
					// TODO: assert Object.keys(ret).length == 0
				}
			});
		};
		self._cb_handlers__SendFundsFormSubmission["fromCpp__SendFundsFormSubmission__get_random_outs"] = function(req_params)
		{
			// convert bridge-strings to native primitive types
			req_params.count = parseInt(req_params.count)
			//
			fn_args.get_random_outs_fn(req_params, function(err_msg, res)
			{
				const args = self.__new_cb_args_with_no_task_id(err_msg, res);
				const ret_string = self.Module.send_cb_II__got_random_outs(JSON.stringify(args))
				const ret = JSON.parse(ret_string);
				if (typeof ret.err_msg !== 'undefined' && ret.err_msg) { // this is actually an exception
					errHandler_fn({ 
						err_msg: ret.err_msg 
					});
					// ^-- this will clean up cb handlers too
					return;
				} else {
					// TODO: assert Object.keys(ret).length == 0
				}
			});
		};
		self._cb_handlers__SendFundsFormSubmission["fromCpp__SendFundsFormSubmission__submit_raw_tx"] = function(req_params)
		{
			fn_args.submit_raw_tx_fn(req_params, function(err_msg, res)
			{
				const args = self.__new_cb_args_with_no_task_id(err_msg, res);
				const ret_string = self.Module.send_cb_III__submitted_tx(JSON.stringify(args))
				const ret = JSON.parse(ret_string);
				if (typeof ret.err_msg !== 'undefined' && ret.err_msg) { // this is actually an exception
					errHandler_fn({ 
						err_msg: ret.err_msg 
					});
					// ^-- this will clean up cb handlers too
					return;
				} else {
					// TODO: assert Object.keys(ret).length == 0
				}
			})
		};
		self._cb_handlers__SendFundsFormSubmission["fromCpp__SendFundsFormSubmission__status_update"] = function(params)
		{
			params.code = parseInt(""+params.code)
			//
			fn_args.status_update_fn(params);
		};
		self._cb_handlers__SendFundsFormSubmission["fromCpp__SendFundsFormSubmission__error"] = errHandler_fn;
		self._cb_handlers__SendFundsFormSubmission["fromCpp__SendFundsFormSubmission__canceled"] = function()
		{
			fn_args.canceled_fn();
			self._cb_handlers__SendFundsFormSubmission = null // reset so we can enter process again
		};
		self._cb_handlers__SendFundsFormSubmission["fromCpp__SendFundsFormSubmission__authenticate"] = function()
		{
			fn_args.authenticate_fn(function(did_pass)
			{
				const payload = { did_pass: did_pass };
				self.Module.send_cb__authentication(JSON.stringify(payload))
			});
		};
		self._cb_handlers__SendFundsFormSubmission["fromCpp__SendFundsFormSubmission__willBeginSending"] = function()
		{
			fn_args.willBeginSending_fn();
		};
		self._cb_handlers__SendFundsFormSubmission["fromCpp__SendFundsFormSubmission__success"] = function(params)
		{
			params.mixin = parseInt(params.mixin)
			params.isXMRAddressIntegrated = MyMoneroBridge_utils.ret_val_boolstring_to_bool(params.isXMRAddressIntegrated)
			//
			fn_args.success_fn(params);
			self._cb_handlers__SendFundsFormSubmission = null // reset so we can enter process again
		};
		const args = 
		{	
			registration_string: fn_args.registration_string,
			isRegisterStr: fn_args.isRegister,
			fromWallet_didFailToInitialize: fn_args.fromWallet_didFailToInitialize,
			fromWallet_didFailToBoot: fn_args.fromWallet_didFailToBoot,
			fromWallet_needsImport: fn_args.fromWallet_needsImport,
			requireAuthentication: fn_args.requireAuthentication,
			//
			destinations: fn_args.destinations,
			hasPickedAContact: fn_args.hasPickedAContact,
			resolvedAddress_fieldIsVisible: fn_args.resolvedAddress_fieldIsVisible,
			manuallyEnteredPaymentID_fieldIsVisible: fn_args.manuallyEnteredPaymentID_fieldIsVisible,
			resolvedPaymentID_fieldIsVisible: fn_args.resolvedPaymentID_fieldIsVisible,

			is_sweeping: fn_args.is_sweeping,
			from_address_string: fn_args.from_address_string,
			sec_viewKey_string: fn_args.sec_viewKey_string,
			sec_spendKey_string: fn_args.sec_spendKey_string,
			pub_spendKey_string: fn_args.pub_spendKey_string,
			priority: "" + fn_args.priority,
			nettype_string: nettype_utils.nettype_to_API_string(fn_args.nettype)
		};
		if (typeof fn_args.contact_payment_id !== 'undefined' && fn_args.contact_payment_id !== null && fn_args.contact_payment_id !== "") {
			args.contact_payment_id = fn_args.contact_payment_id;
		}
		if (typeof fn_args.cached_OAResolved_address !== 'undefined' && fn_args.cached_OAResolved_address !== null && fn_args.cached_OAResolved_address !== "") {
			args.cached_OAResolved_address = fn_args.cached_OAResolved_address;
		}
		if (typeof fn_args.contact_hasOpenAliasAddress !== 'undefined' && fn_args.contact_hasOpenAliasAddress !== null && fn_args.contact_hasOpenAliasAddress !== "") {
			args.contact_hasOpenAliasAddress = fn_args.contact_hasOpenAliasAddress;
		}
		if (typeof fn_args.contact_address !== 'undefined' && fn_args.contact_address !== null && fn_args.contact_address !== "") {
			args.contact_address = fn_args.contact_address;
		}
		if (typeof fn_args.enteredAddressValue !== 'undefined' && fn_args.enteredAddressValue !== null && fn_args.enteredAddressValue !== "") {
			args.enteredAddressValue = fn_args.enteredAddressValue;
		}
		if (typeof fn_args.resolvedAddress !== 'undefined' && fn_args.resolvedAddress !== null && fn_args.resolvedAddress !== "") {
			args.resolvedAddress = fn_args.resolvedAddress;
		}
		if (typeof fn_args.manuallyEnteredPaymentID !== 'undefined' && fn_args.manuallyEnteredPaymentID !== null && fn_args.manuallyEnteredPaymentID !== "") {
			args.manuallyEnteredPaymentID = fn_args.manuallyEnteredPaymentID;
		}
		if (typeof fn_args.resolvedPaymentID !== 'undefined' && fn_args.resolvedPaymentID !== null && fn_args.resolvedPaymentID !== "") {
			args.resolvedPaymentID = fn_args.resolvedPaymentID;
		}
		//
		// ── HF21 private tokens ───────────────────────────────────────────
		// Send a token instead of BDX. The amounts in destinations are then
		// denominated in that token, while the fee is still paid in BDX out of
		// the wallet's native outputs. token_decimal_point is required alongside
		// token_id: send amounts are human-readable and a token's scale is its
		// own, not BDX's 9, so the C++ side refuses rather than mis-parsing it.
		if (typeof fn_args.token_id !== 'undefined' && fn_args.token_id !== null && fn_args.token_id !== "") {
			args.token_id = fn_args.token_id;
		}
		if (typeof fn_args.token_decimal_point !== 'undefined' && fn_args.token_decimal_point !== null && fn_args.token_decimal_point !== "") {
			args.token_decimal_point = "" + fn_args.token_decimal_point;
		}
		// Deploy a new asset. This one supplies no destinations: they are derived
		// from the descriptor and all point back at the sending wallet, which is
		// where the initial supply is minted. The token's id is derived from the
		// descriptor rather than chosen, and comes back on success_fn as
		// params.token_id -- there is no other way to learn it.
		if (typeof fn_args.is_deploy_token !== 'undefined' && fn_args.is_deploy_token) {
			const descriptor = fn_args.token_descriptor;
			if (typeof descriptor === 'undefined' || descriptor === null) {
				throw "Expected fn_args.token_descriptor when is_deploy_token is set"
			}
			args.is_deploy_token = true;
			// Everything crosses this bridge as a string, as with priority above.
			// Supplies are human-readable on the token's own scale, like
			// send_amount is: "1000" of an 8-decimal token, not 100000000000.
			args.token_descriptor = {
				ticker: "" + descriptor.ticker,
				full_name: "" + (descriptor.full_name || ""),
				meta_info: "" + (descriptor.meta_info || ""),
				decimal_point: "" + descriptor.decimal_point,
				total_max_supply: "" + descriptor.total_max_supply,
				current_supply: "" + (descriptor.current_supply || "0")
			};
		}
		const args_str = JSON.stringify(args, null, '')
		// console.log('semd-funds args_str', args_str);
		const ret_string = this.Module.send_funds(args_str);
		const ret = JSON.parse(ret_string);
		if (typeof ret.err_msg !== 'undefined' && ret.err_msg) { // this is actually an exception
			errHandler_fn({ 
				err_msg: ret.err_msg 
			});
			// ^-- this will clean up cb handlers too
			return;
		} else {
			// TODO: assert Object.keys(ret).length == 0
		}

	}
}
module.exports = BeldexLibAppBridgeClass;
