/**
 * @Author: Ankith Ravindran <ankithravindran>
 * @Date:   2021-10-25T14:34:27+11:00
 * @Filename: mp_ss_invoice.js
 * @Last modified by:   ankithravindran
 * @Last modified time: 2022-05-31T08:59:26+10:00
 */



/**
 * WS
 *
 * [beforeLoad]
 *
 * WS Edit:
 * 1605XX: 1. Lock All product Invoice Types: AP Satchels, Toll Satchels and AP Product. Only specific roles can edit these invoices.
 *
 *
 */

var baseURL = 'https://1048144.app.netsuite.com';
if (nlapiGetContext().getEnvironment() == "SANDBOX") {
  baseURL = 'https://system.sandbox.netsuite.com';
}

var newInvoiceSubTotal = 0.0;

function beforeLoad(type, form, request) {

  var custId = nlapiGetFieldValue('entity');
  // nlapiLogExecution('DEBUG', 'ID', request.getParameter('itemids'));


  if (nlapiGetContext().getExecutionContext() == 'userinterface' && (type ==
      'copy' || type == 'create')) {

    if (!isNullorEmpty(request.getParameter('itemids'))) {
      var item = request.getParameter('itemids');
    }
    if (!isNullorEmpty(request.getParameter('qty'))) {
      var qty = request.getParameter('qty');
    }
    if (!isNullorEmpty(request.getParameter('rate'))) {
      var rate = request.getParameter('rate');
    }
    if (!isNullorEmpty(request.getParameter('next_customer'))) {
      var next_customer = request.getParameter('next_customer');
    }
    if (!isNullorEmpty(request.getParameter('gst'))) {
      var gst = request.getParameter('gst');
    }
    if (!isNullorEmpty(request.getParameter('start_date'))) {
      var start_date = request.getParameter('start_date');
    }
    if (!isNullorEmpty(request.getParameter('end_date'))) {
      var end_date = request.getParameter('end_date');
    }

    if (!isNullorEmpty(custId)) {



      var isZee = checkCustomerIsFranchisee(custId);
      var isHO = checkHeadOfficeCustomer(custId);
      var custForm = parseInt(nlapiGetFieldValue('customform'));

      if ((isZee || isHO) && custForm != 123) {
        if (!isNullorEmpty(request.getParameter('id')) && !isNullorEmpty(
            request.getParameter('memdoc'))) {
          nlapiSetRedirectURL('RECORD', nlapiGetRecordType(), null, null, {
            e: 'T',
            cf: 123,
            id: request.getParameter('id'),
            memdoc: request.getParameter('memdoc')
          });
        } else {
          nlapiSetRedirectURL('RECORD', nlapiGetRecordType(), null, null, {
            entity: nlapiGetFieldValue('entity'),
            cf: 123
          });
        }
      }
      if (!isZee && !isHO && custForm != 116) {
        if (!isNullorEmpty(request.getParameter('id')) && !isNullorEmpty(
            request.getParameter('memdoc'))) {
          nlapiSetRedirectURL('RECORD', nlapiGetRecordType(), null, null, {
            e: 'T',
            cf: 116,
            id: request.getParameter('id'),
            memdoc: request.getParameter('memdoc')
          });
        } else {
          nlapiSetRedirectURL('RECORD', nlapiGetRecordType(), null, null, {
            entity: nlapiGetFieldValue('entity'),
            cf: 116
          });
        }
      }

      var recCustomer = nlapiLoadRecord('customer', nlapiGetFieldValue('entity'));

      var nlineCount = nlapiGetLineItemCount('item');
      var arrPricing = [];



      if (!isNullorEmpty(item) && !isNullorEmpty(qty) && !isNullorEmpty(rate) &&
        !isNullorEmpty(next_customer) && !isNullorEmpty(gst)) {
        var item_array = item.split(',');
        var qty_array = qty.split(',');
        var rate_array = rate.split(',');
        var gst_array = gst.split(',');

        for (var i = 0; i < item_array.length; i++) {

          var strItem = item_array[i];



          var strRate = rate_array[i];
          var strQty = qty_array[i];
          var gstVal = gst_array[i];
          nlapiSetLineItemValue('item', 'item', (i + 1), strItem);
          nlapiSetLineItemValue('item', 'quantity', (i + 1), strQty);
          nlapiSetLineItemValue('item', 'rate', (i + 1), strRate);
          nlapiSetLineItemValue('item', 'taxcode', (i + 1), gstVal);

          // arrPricing[item_array[i]] = strRate;

          // if (!isNullorEmpty(arrPricing[strItem])) {
          //     nlapiSetLineItemValue('item', 'rate', i, arrPricing[strItem]);
          // }
          //
          var strTaxRate = 10;
          var calcAmt = parseFloat(strQty) * parseFloat(strRate);
          if (gstVal == '7') {
            nlapiSetLineItemValue('item', 'taxrate1', (i + 1), 10);
            strTaxRate = 10;
          } else if (gstVal == '9') {
            nlapiSetLineItemValue('item', 'taxrate1', (i + 1), 0);
          }
          var calcTax = parseFloat(strQty) * parseFloat(strRate) * (parseFloat(
            strTaxRate) / 100);
          var calcGross = parseFloat(strQty) * parseFloat(strRate) * (1 + (
            parseFloat(strTaxRate) / 100));
          nlapiSetLineItemValue('item', 'amount', (i + 1), nlapiFormatCurrency(
            calcAmt));
          nlapiSetLineItemValue('item', 'tax1amt', (i + 1), nlapiFormatCurrency(
            calcTax));
          nlapiSetLineItemValue('item', 'grossamt', (i + 1),
            nlapiFormatCurrency(calcGross));

        }



      } else {
        for (i = 1; i <= recCustomer.getLineItemCount('itempricing'); i++) {
          arrPricing[recCustomer.getLineItemValue('itempricing', 'item', i)] =
            recCustomer.getLineItemValue('itempricing', 'price', i);
        }

        for (i = 1; !isNullorEmpty(nlineCount) && i <= nlineCount; i++) {
          var strItem = nlapiGetLineItemValue('item', 'item', i);



          var strRate = nlapiGetLineItemValue('item', 'rate', i);
          var strQty = nlapiGetLineItemValue('item', 'quantity', i);
          var strTaxRate = nlapiGetLineItemValue('item', 'taxrate1', i);
          if (!isNullorEmpty(arrPricing[strItem])) {
            nlapiSetLineItemValue('item', 'rate', i, arrPricing[strItem]);
          }
          var calcAmt = parseFloat(strQty) * parseFloat(nlapiGetLineItemValue(
            'item', 'rate', i));
          var calcTax = parseFloat(strQty) * parseFloat(nlapiGetLineItemValue(
            'item', 'rate', i)) * (parseFloat(strTaxRate) / 100);
          var calcGross = parseFloat(strQty) * parseFloat(nlapiGetLineItemValue(
            'item', 'rate', i)) * (1 + (parseFloat(strTaxRate) / 100));
          nlapiSetLineItemValue('item', 'amount', i, nlapiFormatCurrency(
            calcAmt));
          nlapiSetLineItemValue('item', 'tax1amt', i, nlapiFormatCurrency(
            calcTax));
          nlapiSetLineItemValue('item', 'grossamt', i, nlapiFormatCurrency(
            calcGross));
        }
      }

      if (!isNullorEmpty(start_date) && !isNullorEmpty(end_date)) {
        nlapiSetFieldValue('custbody_source_suitelet',
          'customscript_sl_services_main_page');
        nlapiSetFieldValue('custbody_cr8_source_deployment',
          'customdeploy_sl_services_main_page');
      }
      nlapiSetFieldValue('custbody6', recCustomer.getFieldValue('custentity11'));
      nlapiSetFieldValue('custbody2', recCustomer.getFieldValue(
        'custentity_customer_pricing_notes'));

      if (!isNullorEmpty(recCustomer.getFieldValue('terms'))) {
        nlapiSetFieldValue('terms', recCustomer.getFieldValue('terms'));
      } else {
        nlapiSetFieldValue('terms', 1);
      }

      for (i = 1; i <= recCustomer.getLineItemCount('addressbook'); i++) {
        if (recCustomer.getLineItemValue('addressbook', 'defaultbilling', i) ==
          "T") {
          nlapiSetFieldValue('billaddresslist', recCustomer.getLineItemValue(
            'addressbook', 'id', i));
          nlapiSetFieldValue('billaddress', recCustomer.getLineItemValue(
            'addressbook', 'addrtext', i));
        }
      }

      if (!isNullorEmpty(recCustomer.getFieldValue('partner'))) {
        var zeeClass = nlapiLookupField('partner', recCustomer.getFieldValue(
          'partner'), ['department', 'location']);
        nlapiSetFieldValue('department', zeeClass.department);
        nlapiSetFieldValue('location', zeeClass.location);
      } else {
        nlapiSetFieldValue('department', 4);
        nlapiSetFieldValue('location', 1);
      }

      if (nlapiGetFieldValue('memo') == 'VOID') {
        nlapiSetFieldValue('memo', "");
      }

      if (isZee) {
        nlapiSetFieldValue('account', 329);
      } else if (isHO) {
        nlapiSetFieldValue('account', 369);
      } else {
        nlapiSetFieldValue('account', 133);
      }
      if (!isZee && !isHO) {
        if (!isNullorEmpty(start_date) && !isNullorEmpty(end_date)) {
          setTranDate(start_date, end_date);
        } else {
          setTranDate(null, null);
        }

      }
    }

    if (nlapiGetRole() == 1000) {
      if (!isNullorEmpty(start_date) && !isNullorEmpty(end_date)) {
        setTranDate(start_date, end_date);
      } else {
        setTranDate(null, null);
      }
      form.getField('trandate').setDisplayType('disabled');
      form.getField('department').setDisplayType('disabled');
      form.getField('partner').setDisplayType('disabled');
      form.getField('location').setDisplayType('disabled');
      form.getField('postingperiod').setDisplayType('disabled');
      form.getField('account').setDisplayType('disabled');
    }

    form.getField('opportunity').setDisplayType('hidden');
    nlapiSetFieldValue('custbody_invoice_emailed', "F");
    nlapiSetFieldValue('custbody_invoice_emailed_date', "");
    if (request.getParameter('custparam_flexi') == "T") {
      form.getField('trandate').setDisplayType('normal');
      form.getField('department').setDisplayType('normal');
      form.getField('location').setDisplayType('normal');
      form.getField('postingperiod').setDisplayType('normal');
      form.getField('account').setDisplayType('normal');
    }

  } else if (nlapiGetContext().getExecutionContext() == 'userinterface' && type ==
    'view') {
    form.getField('opportunity').setDisplayType('hidden');
    if (!isNullorEmpty(custId)) {
      var isZee = checkCustomerIsFranchisee(custId);
      var isHO = checkHeadOfficeCustomer(custId);
      var custForm = parseInt(nlapiGetFieldValue('customform'));
      if ((isZee || isHO) && custForm != 123 && parseInt(request.getParameter(
          'cf')) != 123) {
        nlapiSetRedirectURL('RECORD', nlapiGetRecordType(), nlapiGetRecordId(),
          null, {
            cf: 123
          });
      }
      if (!isZee && !isHO && custForm != 116 && parseInt(request.getParameter(
          'cf')) != 116) {
        nlapiSetRedirectURL('RECORD', nlapiGetRecordType(), nlapiGetRecordId(),
          null, {
            cf: 116
          });
      }
    }

  } else if (nlapiGetContext().getExecutionContext() == 'userinterface' && (
      type == 'edit')) {
    var override_bill_payment_check = request.getParameter('override');

    var recId = nlapiGetRecordId();
    var recIn = nlapiGetNewRecord();
    // Search for any assocated Bill.
    var billSearch = nlapiSearchRecord('vendorbill', null, [new nlobjSearchFilter(
      'mainline', null, 'is', 'T'), new nlobjSearchFilter(
      'custbody_invoice_reference', null, 'anyof', recId)], [new nlobjSearchColumn(
      'internalid')]);

    if (!isNullorEmpty(billSearch)) {

      // Check if invoice has only 1 Bill
      if (billSearch.length == 1) {

        var billRecord = nlapiLoadRecord('vendorbill', billSearch[0].getValue(
          'internalid'));
        var payments = billRecord.getFieldValue('payments');

        // Check if Bill has payments
        if (override_bill_payment_check != 'T' || nlapiGetRole() != 3) { // overide only available for administrators

          if (payments == 'T' /*&& nlapiGetRole() != 3*/ ) {

            var bill_url =
              'https://1048144.app.netsuite.com/app/accounting/transactions/vendbill.nl?id=' +
              billSearch[0].getValue('internalid') + '&whence=';

            var body =
              'Error Details: Payment exists for related bill. \n\nUserID: ' +
              nlapiGetUser() + ' | ' + nlapiGetRole() + ',\nContext: ' +
              nlapiGetContext() + ',\nBill URL: ' + bill_url +
              ' ,\nFranchisee: ' + recIn.getFieldValue('partner');

            nlapiSendEmail(409635, ['ankith.ravindran@mailplus.com.au',
              'Willian.Suryadharma@mailplus.com.au'
            ], 'Locked Invoice', body, null);

            throw nlapiCreateError('RECORD_LOCKED',
              'Record Locked: Franchisee distributions have already been paid in respect of this transaction.',
              true);
          }
        }

        // Check if invoice is customer invoice and accessed by franchisee
        if (!isNullorEmpty(nlapiLookupField('customer', recIn.getFieldValue(
            'entity'), 'custentity_np_customer_type')) && nlapiGetRole() ==
          1000) {

          var bill_url =
            'https://system.netsuite.com/app/accounting/transactions/vendbill.nl?id=' +
            billSearch[0].getValue('internalid') + '&whence=';
          var body =
            'Error Details: Franchisee cannot edit NeoPost invoice. Please contact head office.\n\nUserID: ' +
            nlapiGetUser() + '\nContext: ' + nlapiGetContext() + '\nBill URL: ' +
            bill_url + '\nFranchisee: ' + recIn.getFieldValue('partner');

          nlapiSendEmail(409635, ['ankith.ravindran@mailplus.com.au',
            'Willian.Suryadharma@mailplus.com.au'
          ], 'Locked Invoice', body, null);

          throw nlapiCreateError('RECORD_LOCKED',
            'Record Locked: Franchisee cannot edit NeoPost invoice. Please contact head office.',
            true);
        }

        // WS Edit 1605XX:
        // only Product Manager and Administrator can edit Product invoices
        if ((parseInt(recIn.getFieldValue('custbody_inv_type')) == 1 ||
            parseInt(recIn.getFieldValue('custbody_inv_type')) == 2 || parseInt(
              recIn.getFieldValue('custbody_inv_type')) == 5 || parseInt(recIn.getFieldValue(
              'custbody_inv_type')) == 8) && (nlapiGetRole() != 1023 &&
            nlapiGetRole() != 1032 && nlapiGetRole() != 3)) {

          var bill_url =
            'https://system.netsuite.com/app/accounting/transactions/vendbill.nl?id=' +
            billSearch[0].getValue('internalid') + '&whence=';
          var body =
            'Error Details: You do not have permission to edit Product (Toll & AP) invoice. Please contact head office. UserID: ' +
            nlapiGetUser() + ', Context: ' + nlapiGetContext() + ', Bill URL: ' +
            bill_url + ' , Franchisee: ' + recIn.getFieldValue('partner');

          nlapiSendEmail(409635, ['ankith.ravindran@mailplus.com.au',
            'Willian.Suryadharma@mailplus.com.au'
          ], 'Locked Invoice', body, null);

          throw nlapiCreateError('RECORD_LOCKED',
            'Record Locked: You do not have permission to edit Product (Toll & AP) invoice. Please contact head office.',
            true);
        }

        // only Administrator can edit Stationery invoices
        if (parseInt(recIn.getFieldValue('custbody_inv_type')) == 3 &&
          nlapiGetRole() != 3) {

          var bill_url =
            'https://system.netsuite.com/app/accounting/transactions/vendbill.nl?id=' +
            billSearch[0].getValue('internalid') + '&whence=';
          var body =
            'Error Details: Franchisee cannot edit Stationery invoice. Please contact head office. UserID: ' +
            nlapiGetUser() + ', Context: ' + nlapiGetContext() + ', Bill URL: ' +
            bill_url + ' , Franchisee: ' + recIn.getFieldValue('partner');

          nlapiSendEmail(409635, ['ankith.ravindran@mailplus.com.au',
            'Willian.Suryadharma@mailplus.com.au'
          ], 'Locked Invoice', body, null);

          throw nlapiCreateError('RECORD_LOCKED',
            'Record Locked: Franchisee cannot edit Stationery invoice. Please contact head office.',
            true);
        }
        // only Finance Role, Finance Manager and Administrator can edit NeoPost inv
        if (parseInt(recIn.getFieldValue('custbody_inv_type')) == 4 && (
            nlapiGetRole() != 3 && nlapiGetRole() != 1001 && nlapiGetRole() !=
            1022)) {

          var bill_url =
            'https://system.netsuite.com/app/accounting/transactions/vendbill.nl?id=' +
            billSearch[0].getValue('internalid') + '&whence=';
          var body =
            'Error Details: Franchisee cannot edit NeoPost invoice. Please contact head office.. UserID: ' +
            nlapiGetUser() + ', Context: ' + nlapiGetContext() + ', Bill URL: ' +
            bill_url + ' , Franchisee: ' + recIn.getFieldValue('partner');

          nlapiSendEmail(409635, ['ankith.ravindran@mailplus.com.au',
            'Willian.Suryadharma@mailplus.com.au'
          ], 'Locked Invoice', body, null);

          throw nlapiCreateError('RECORD_LOCKED',
            'Record Locked: Franchisee cannot edit NeoPost invoice. Please contact head office.',
            true);
        }
      } else { // if more than 1 Bill throw error

        var invoice_url =
          'https://system.netsuite.com/app/accounting/transactions/custinvc.nl?id=' +
          recId + '&cf=116&whence=';
        var body = 'Error Details: Multiple Bills linked to invoice. UserID: ' +
          nlapiGetUser() + ', Context: ' + nlapiGetContext() +
          ', Invoice URL: ' + invoice_url + ' , Franchisee ID: ' + recIn.getFieldValue(
            'partner');

        nlapiSendEmail(409635, ['ankith.ravindran@mailplus.com.au',
          'Willian.Suryadharma@mailplus.com.au'
        ], 'Locked Invoice', body, null);

      }
    }
  }
}

/**
 * On the deletion or editing of an invoice, remove any associated bills. Note when editing invoices, regardless of
 * any post creation adjustments, the bill will be removed.
 *
 * WS Edit:
 * 1603XX: 1. validation of franchisee on invoice & on customer record
 * 1605XX:
 * 1. if !AP Product Invoice, validate zeeCust vs zeeOnInv
 * 2. Validate on Regular Invoices - No special Items allowed
 * 3. Validate on AP Product Invoices to ensure 'Mailplus Pty Ltd' zee and no other non AP items.
 * 4. Validate all non-regular service invoices to ensure no other item types.
 *
 * @param {Object} type
 */
function beforeSubmit(type) {

  /**
   * Invoice Type List
   *
   * Toll : 1
   * AP Satchels : 2
   * OB Stationery : 3
   * Neopost : 4
   * AP Product : 5
   *
   */

  var recId = nlapiGetRecordId();
  var rec = nlapiGetNewRecord();
  var recOld = nlapiGetOldRecord();



  nlapiLogExecution('DEBUG', 'Before Submit Context ', nlapiGetContext().getExecutionContext());
  nlapiLogExecution('DEBUG', 'nlapiGetFieldValue;', nlapiGetFieldValue('entity'));
  nlapiLogExecution('DEBUG', 'rec.getFieldValue(entity);', rec.getFieldValue(
    'entity'));
  // nlapiLogExecution('DEBUG', 'recId.getFieldValue(entity);', recId.getFieldValue('entity'));
  // nlapiLogExecution('DEBUG', 'recOld.getFieldValue(entity);', recOld.getFieldValue('entity'));

  if ((nlapiGetContext().getExecutionContext() == 'userinterface' ||
      nlapiGetContext().getExecutionContext() == 'scheduled') && (type ==
      'create')) {
    if (!isNullorEmpty(rec)) {
      nlapiLogExecution('DEBUG', 'rec.getFieldValue(entity);', rec.getFieldValue(
        'entity'));
      var custId = rec.getFieldValue('entity');
      var zeeOnInv = rec.getFieldValue('partner');
      var zeeOnInvTxt = rec.getFieldText('partner').toLowerCase();
      var invtype = rec.getFieldValue('custbody_inv_type');
      if (!isNullorEmpty(invtype)) {
        invtype = parseInt(invtype);
      }
      addDiscount(custId, rec, invtype);
      addSurcharges(rec, invtype, custId);
    } else if (!isNullorEmpty(recOld)) {
      nlapiLogExecution('DEBUG', 'recOld.getFieldValue(entity);', recOld.getFieldValue(
        'entity'));
      var custId = recOld.getFieldValue('entity');
      var zeeOnInv = recOld.getFieldValue('partner');
      var zeeOnInvTxt = recOld.getFieldText('partner').toLowerCase();
      var invtype = parseInt(recOld.getFieldValue('custbody_inv_type'));
      if (!isNullorEmpty(invtype)) {
        invtype = parseInt(invtype);
      }
      addDiscount(custId, recOld, invtype);
      addSurcharges(recOld, invtype, custId);
    }

    var userId = nlapiGetUser();
    var zeeCust = nlapiLookupField('customer', custId, 'partner');

    var old = "old ";


  }

  if (nlapiGetContext().getExecutionContext() == 'userinterface' && (type !=
      'delete')) {

    var custId = rec.getFieldValue('entity');
    var userId = nlapiGetUser();
    var zeeCust = nlapiLookupField('customer', custId, 'partner');
    var zeeOnInv = rec.getFieldValue('partner');
    var zeeOnInvTxt = rec.getFieldText('partner').toLowerCase();
    var old = "old ";

    // WS Edit 1605XX: 1. if !AP Product Invoice, validate zeeCust vs zeeOnInv
    if (parseInt(rec.getFieldValue('custbody_inv_type')) != 5 && parseInt(rec.getFieldValue(
        'custbody_inv_type')) != 8 && parseInt(rec.getFieldValue(
        'custbody_inv_type')) != 9 && parseInt(rec.getFieldValue(
        'custbody_inv_type')) != 10) {
      // WS Edit 1603XX: 1.
      if (!isNullorEmpty(custId)) {
        if (zeeOnInvTxt.toLowerCase().substring(0, old.length) !== old) {
          if (nlapiGetRole() == 1000 && (userId != zeeCust)) {
            throw nlapiCreateError('INSUFFICIENT_PERMISSION',
              '   Insufficient Permission: Customer on Invoice is not assigned to your territory. \n\nPlease contact the Finance team.',
              true);
          }
          if (zeeOnInv != zeeCust) {
            throw nlapiCreateError('INSUFFICIENT_PERMISSION',
              '   Insufficient Permission: Customer on Invoice is not in the correct franchise territory. \n\nPlease ensure that Franchisee on customer record and Invoice(s) are the same.',
              true);
          }
        }
      }
    }

    nlapiLogExecution('DEBUG', 'inv type text', rec.getFieldText(
        'custbody_inv_type'))
      // WS Edit 1605XX: 2. Validate on Regular Invoices - No special Items allowed
    if (isNullorEmpty(rec.getFieldValue('custbody_inv_type'))) {
      checkInvLineItem(rec, '', 1, type);
    }


    // WS Edit 1605XX: 3. Validate on AP Product Invoices to ensure 'Mailplus Pty Ltd' zee and no other non AP items.
    if (parseInt(rec.getFieldValue('custbody_inv_type')) == 5 || parseInt(rec.getFieldValue(
        'custbody_inv_type')) == 8) {

      // check if AP Product Invoice is under Mailplus Pty Ltd
      // reject change if zeeOnInv != Mailplus Pty Ltd
      if (zeeOnInv != 435) {
        throw nlapiCreateError('INVALID_FRANCHISEE',
          '   Invalid Franchisee: Franchisee on <u><b>AP Product Invoice(s)</b></u> must be <u><b>Mailplus Pty Ltd</u></b>. Please contact the Product team for more information.',
          true);
      }
      if (parseInt(rec.getFieldValue('custbody_inv_type')) == 5) {
        checkInvLineItem(rec, 5);
      } else if (parseInt(rec.getFieldValue('custbody_inv_type')) == 8) {
        checkInvLineItem(rec, 8);
      }

    }
    // WS Edit 1605XX: 4. Validate all non-regular service invoices to ensure no other item types.
    if (parseInt(rec.getFieldValue('custbody_inv_type')) == 1) {
      checkInvLineItem(rec, 1);
    }
    if (parseInt(rec.getFieldValue('custbody_inv_type')) == 2) {
      checkInvLineItem(rec, 2);
    }
    if (parseInt(rec.getFieldValue('custbody_inv_type')) == 3) {
      checkInvLineItem(rec, 3);
    }
    if (parseInt(rec.getFieldValue('custbody_inv_type')) == 4) {
      checkInvLineItem(rec, 4);
    }


    if (type == 'create') {

      if (!isNullorEmpty(nlapiLookupField('customer', rec.getFieldValue(
          'entity'), 'custentity_np_customer_type'))) {
        rec.setFieldValue('custbody_inv_date_range_from', rec.getFieldValue(
          'trandate'));
        rec.setFieldValue('custbody_inv_date_range_to', nlapiDateToString(
          nlapiAddDays(nlapiAddMonths(nlapiStringToDate(rec.getFieldValue(
            'trandate')), 1), -1)));
      }
    }
  }

  nlapiLogExecution('DEBUG', 'After Submit Context ', nlapiGetContext().getExecutionContext());
  nlapiLogExecution('DEBUG', 'After Submit Context ', type);


  if (nlapiGetContext().getExecutionContext() == 'userinterface' && type ==
    'edit') {
    if (!isNullorEmpty(rec)) {
      nlapiLogExecution('DEBUG', 'rec.getFieldValue(entity);', rec.getFieldValue(
        'entity'));
      var custId = rec.getFieldValue('entity');
      var zeeOnInv = rec.getFieldValue('partner');
      var zeeOnInvTxt = rec.getFieldText('partner').toLowerCase();
      var invtype = rec.getFieldValue('custbody_inv_type');
      if (!isNullorEmpty(invtype)) {
        invtype = parseInt(invtype);
      }
      // checkInvLineItem(rec, '', 1);
      addDiscount(custId, rec, invtype);
      addSurcharges(rec, invtype, custId);
    } else if (!isNullorEmpty(recOld)) {
      nlapiLogExecution('DEBUG', 'recOld.getFieldValue(entity);', recOld.getFieldValue(
        'entity'));
      var custId = recOld.getFieldValue('entity');
      var zeeOnInv = recOld.getFieldValue('partner');
      var zeeOnInvTxt = recOld.getFieldText('partner').toLowerCase();
      var invtype = parseInt(recOld.getFieldValue('custbody_inv_type'));
      if (!isNullorEmpty(invtype)) {
        invtype = parseInt(invtype);
      }
      // checkInvLineItem(rec, '', 1);
      addDiscount(custId, recOld, invtype);
      addSurcharges(recOld, invtype, custId);
    }
  }

  if (type == 'delete' && !isNullorEmpty(recId)) {
    deleteVendorBill(recId);
  }

}

function addDiscount(custId, rec, invtype, match) {

  nlapiLogExecution('DEBUG', 'rec', rec)


  var customerID = rec.getFieldValue('entity');
  nlapiLogExecution('DEBUG', 'customerID', customerID)
  var invoiceSubtotal = rec.getFieldValue('subtotal');
  var customerRecord = nlapiLoadRecord('customer', custId);
  var invoice_discount = customerRecord.getFieldValue(
    'custentity_pop_up_discount');
  var invoice_discount_applied = customerRecord.getFieldValue(
    'custentity_10_off_applied');

  nlapiLogExecution('DEBUG', 'invoiceSubtotal', invoiceSubtotal)
  nlapiLogExecution('DEBUG', 'invoice_discount', invoice_discount)
  nlapiLogExecution('DEBUG', 'invoice_discount_applied',
    invoice_discount_applied)

  if (invoice_discount == 1 && (invoice_discount_applied == 2 || isNullorEmpty(
      invoice_discount_applied))) {
    var discount = 10;
    var discount_to_be_applied = -(0.1 * invoiceSubtotal);

    nlapiLogExecution('DEBUG', 'discount', discount)
    nlapiLogExecution('DEBUG', 'discount_to_be_applied', discount_to_be_applied)

    rec.selectNewLineItem('item');
    if (invtype == 8) {
      rec.setCurrentLineItemValue('item', 'item', 9555);
    } else {
      rec.setCurrentLineItemValue('item', 'item', 9554);
    }

    rec.setCurrentLineItemValue('item', 'rate', discount_to_be_applied);
    rec.setCurrentLineItemValue('item', 'quantity', 1);
    rec.commitLineItem('item');

    // nlapiSubmitRecord(rec)

    customerRecord.setFieldValue('custentity_10_off_applied', 1);

    nlapiSubmitRecord(customerRecord);
  }

}

function addSurcharges(rec, invtype, custId) {

  nlapiLogExecution('DEBUG', 'inside add surcharges')
  nlapiLogExecution('DEBUG', 'invtype', invtype)

  var manual_surcharge_applied = rec.getFieldValue(
    'custbody_inv_manual_surcharge');
  var fuel_surcharge_applied = rec.getFieldValue('custbody_inv_fuel_surcharge');
  var applyFuelSurcharge = rec.getFieldValue('custbody_apply_fuel_surcharge');
  var invoiceSubtotal = rec.getFieldValue('subtotal');
  var invoiceDate = rec.getFieldValue('trandate');


  if (invoiceDate < '31/5/2022') {
    nlapiLogExecution('DEBUG', 'before May 2022', invoiceDate);
  } else {
    nlapiLogExecution('DEBUG', 'On or after May 2022', invoiceDate);
  }


  var customerID = rec.getFieldValue('entity');
  var customerRecord = nlapiLoadRecord('customer', custId);

  var service_fuel_surcharge = customerRecord.getFieldValue(
    'custentity_service_fuel_surcharge');
  var service_fuel_surcharge_rate = customerRecord.getFieldValue(
    'custentity_service_fuel_surcharge_percen');

  var mpex_surcharge = customerRecord.getFieldValue(
    'custentity_mpex_surcharge');
  var mpex_surcharge_rate = customerRecord.getFieldValue(
    'custentity_mpex_surcharge_rate');

  if (invtype == 8) {
    if (mpex_surcharge == 1 || mpex_surcharge == '1') {
      //Applying Shipping Surcharge at a flat rate
      if (manual_surcharge_applied == 1 || manual_surcharge_applied == '1') {
        //Additonal 7.5% if all barcodes used in the invoicing period is manual
        mpex_surcharge_rate = parseFloat(mpex_surcharge_rate) + 7.5;
      }

      var surcharge_rate = 0;
      surcharge_rate = invoiceSubtotal * (mpex_surcharge_rate / 100);

      rec.selectNewLineItem('item');
      rec.setCurrentLineItemValue('item', 'item', 9577);
      rec.setCurrentLineItemValue('item', 'rate', surcharge_rate);
      rec.setCurrentLineItemValue('item', 'quantity', 1);
      rec.commitLineItem('item');

    } else {
      //Applying MPEX Surcharge based on the tiered percentage based on the invoice value.
      if (manual_surcharge_applied == 1 || manual_surcharge_applied == '1') {
        //All barcodes used in the invoicing period is manual
        var surcharge_rate = 0;

        if (invoiceSubtotal < 250) {
          surcharge_rate = invoiceSubtotal * (16.7 / 100)
        } else if (invoiceSubtotal >= 250 && invoiceSubtotal <= 1250) {
          surcharge_rate = invoiceSubtotal * (12.7 / 100)
        } else if (invoiceSubtotal > 1250) {
          surcharge_rate = invoiceSubtotal * (9.7 / 100)
        }


        rec.selectNewLineItem('item');
        rec.setCurrentLineItemValue('item', 'item', 9568);
        rec.setCurrentLineItemValue('item', 'rate', surcharge_rate);
        rec.setCurrentLineItemValue('item', 'quantity', 1);
        rec.commitLineItem('item');
      } else if (fuel_surcharge_applied == 1 || fuel_surcharge_applied == '1') {
        var surcharge_rate = 0;

        if (invoiceSubtotal < 250) {
          surcharge_rate = invoiceSubtotal * (9.2 / 100)
        } else if (invoiceSubtotal >= 250 && invoiceSubtotal <= 1250) {
          surcharge_rate = invoiceSubtotal * (5.2 / 100)
        } else if (invoiceSubtotal > 1250) {
          surcharge_rate = invoiceSubtotal * (2.2 / 100)
        }

        rec.selectNewLineItem('item');
        rec.setCurrentLineItemValue('item', 'item', 9568);
        rec.setCurrentLineItemValue('item', 'rate', surcharge_rate);
        rec.setCurrentLineItemValue('item', 'quantity', 1);
        rec.commitLineItem('item');
      }
    }
  } else if ((isNullorEmpty(invtype) || invtype == 'NaN') && applyFuelSurcharge !=
    2) {

    nlapiLogExecution('DEBUG', 'service_fuel_surcharge', service_fuel_surcharge)
      //Applying Service Fuel Surcharge
    if (service_fuel_surcharge == '1' || service_fuel_surcharge_rate == 1) {

      var surcharge_rate = 0;
      if (newInvoiceSubTotal == 0.0) {
        surcharge_rate = invoiceSubtotal * (service_fuel_surcharge_rate / 100);
      } else {
        surcharge_rate = newInvoiceSubTotal * (service_fuel_surcharge_rate /
          100);
      }


      rec.selectNewLineItem('item');
      rec.setCurrentLineItemValue('item', 'item', 9565);
      rec.setCurrentLineItemValue('item', 'rate', surcharge_rate);
      rec.setCurrentLineItemValue('item', 'quantity', 1);
      rec.commitLineItem('item');
    }
  }
}

function checkInvLineItem(rec, invtype, match, type) {

  nlapiLogExecution('DEBUG', 'invtype', invtype);

  var customerID = rec.getFieldValue('entity');
  var invoiceSubtotal = rec.getFieldValue('subtotal');
  var applyFuelSurcharge = rec.getFieldValue('custbody_apply_fuel_surcharge');
  var customerRecord = nlapiLoadRecord('customer', customerID);
  var customerName = customerRecord.getFieldValue('companyname');
  var adminFeeNotApplicable = customerRecord.getFieldValue(
    'custentity_inv_no_admin_fee');
  var linkedMPCustomer = customerRecord.getFieldValue(
    'custentity_np_mp_customer');
  var linkedMPCustomerText = customerRecord.getFieldText(
    'custentity_np_mp_customer');
  var linkedSpecialCustomer = customerRecord.getFieldValue(
    'custentity_np_np_customer');
  var linkedSpecialCustomerText = customerRecord.getFieldText(
    'custentity_np_np_customer');
  var specialCustomerType = customerRecord.getFieldValue(
    'custentity_special_customer_type');

  for (n = 1; n <= rec.getLineItemCount('item'); n++) {
    var itemn = rec.getLineItemValue('item', 'item', n);

    if (itemn == 9565 && nlapiGetContext().getExecutionContext() ==
      'userinterface' && type ==
      'edit') {
      newInvoiceSubTotal = invoiceSubtotal - parseFloat(rec.getLineItemValue(
        'item', 'rate', n))
      nlapiLogExecution('DEBUG', 'remove fuel surcharge')
      rec.removeLineItem('item', n);
    } else if (nlapiGetRole() != 3) { // WS Edit 1804XX: Bypass for Administrator
      var itemn = rec.getLineItemValue('item', 'item', n);

      var result = null;



      //Special Customer
      if (!isNullorEmpty(linkedMPCustomer) && !isNullorEmpty(
          specialCustomerType)) {
        if (specialCustomerType != 4) {
          nlapiLogExecution('DEBUG', 'specialCustomerType', specialCustomerType)
          var specialCustomerTypeRecord = nlapiLoadRecord(
            'customrecord_special_customer_type', specialCustomerType);
          var allowedItems = specialCustomerTypeRecord.getFieldValues(
            'custrecord_special_allowed_item');
          if (!isNullorEmpty(itemn)) {
            result = allowedItems.indexOf(itemn);
            if (!isNullorEmpty(result) && result == -1) {
              throw nlapiCreateError('INVALID_ITEM',
                '   Invalid Item: Item - <u><b>' + loadItem(itemn).getFieldValue(
                  'itemid') + '</b></u> cannot be used for Customer: ' +
                customerName + '.<br>Please use ' + linkedMPCustomerText +
                ' to Invoice this item.', true);
            }
          }
        }

      } else if (!isNullorEmpty(linkedSpecialCustomer) && isNullorEmpty(
          specialCustomerType)) {
        nlapiLogExecution('DEBUG', 'linkedSpecialCustomer',
            linkedSpecialCustomer)
          //MP Customer related to special customer.
        var specialCustomerRecord = nlapiLoadRecord('customer',
          linkedSpecialCustomer);

        var specialCustomerSpecialCustomerType = specialCustomerRecord.getFieldValue(
          'custentity_special_customer_type');

        var specialCustomerTypeRecord = nlapiLoadRecord(
          'customrecord_special_customer_type',
          specialCustomerSpecialCustomerType);

        var allowedItems = specialCustomerTypeRecord.getFieldValues(
          'custrecord_special_allowed_item');

        result = allowedItems.indexOf(itemn);

        if (!isNullorEmpty(result) && result == -1) {

        } else {
          throw nlapiCreateError('INVALID_ITEM',
            '   Invalid Item: Item - <u><b>' + loadItem(itemn).getFieldValue(
              'itemid') + '</b></u> cannot be used for Customer: ' +
            customerName + '.<br>Please use ' + linkedSpecialCustomerText +
            ' to Invoice this item. ', true);
        }
      }

      var itemInvType = loadItem(itemn).getFieldValue('custitem_inv_type');
      var invTypeText = rec.getFieldText('custbody_inv_type');
      var itemInvTypeText = loadItem(itemn).getFieldText('custitem_inv_type');

      nlapiLogExecution('DEBUG', 'Inside Check Line Item');
      nlapiLogExecution('DEBUG', 'invtype', invtype);
      nlapiLogExecution('DEBUG', 'itemInvType', itemInvType);
      nlapiLogExecution('DEBUG', 'itemInvTypeText', itemInvTypeText);
      nlapiLogExecution('DEBUG', 'match', match);

      if (match == 1) {
        if (!isNullorEmpty(itemInvType)) {
          throw nlapiCreateError('INVALID_ITEM',
            '   Invalid Item: Item - <u><b>' + loadItem(itemn).getFieldValue(
              'itemid') +
            '</b></u> cannot be used in regular service invoices.<br>Please contact Finance/Product Team.',
            true);
        }
      } else {
        if (parseInt(itemInvType) != parseInt(invtype)) {
          throw nlapiCreateError('INVALID_ITEM',
            '   Invalid Item: Item - <u><b>' + loadItem(itemn).getFieldValue(
              'itemid') + '</b></u> cannot be used for ' + invTypeText +
            ' invoices.<br>Please contact Finance/Product Team.', true);
        }
      }
    }

    if (adminFeeNotApplicable == 1) {
      if (itemn == 8729) {
        throw nlapiCreateError('INVALID_ITEM', '   Invalid Item: Item - <u><b>' +
          loadItem(itemn).getFieldValue('itemid') +
          '</b></u> cannot be used for Customer: ' + customerName +
          ' as Admin Fee Not Applicable is set to YES. <br>Please contact Finance Team for more information. ',
          true);
      }
    }

    var itemn = rec.getLineItemValue('item', 'item', n);
    var itemn_details = rec.getLineItemValue('item', 'custcol1', n);

    nlapiLogExecution('DEBUG', 'itemn', itemn);
    nlapiLogExecution('DEBUG', 'itemn_details', itemn_details);

    if (!checkCustomerIsFranchisee(customerID)) {
      if (itemn == 108 || itemn == 44) {
        if (isNullorEmpty(itemn_details)) {
          throw nlapiCreateError('ITEM DETAILS REQUIRED', ' Item - <u><b>' +
            loadItem(itemn).getFieldValue('itemid') +
            '</b></u>: Please Enter Item Detail / Description ', true);
        }
      }
    }


  }
}


/**
 * On creation and/or updating of an invoice perform the following checks and updates ;
 * 1. Vendor Bills.
 *  a. Delete any associated vendor Bill (done by the beforeSubmit).
 * b.Create a vendor bill based on the vendors commission structure.
 *  c. Update the bill status to reflect the invoice status.
 *
 * WS Edit:
 * 1605XX:
 * 1. Add variable invtype
 * 2. Add parameter to createVendorBill function
 *
 * @param {Object} type
 */
function afterSubmit(type) {
  var oldRecord = nlapiGetOldRecord();
  var newRecord = nlapiGetNewRecord();
  var newCustId = newRecord.getFieldValue('entity');
  var suitletId = newRecord.getFieldValue('custbody_source_suitelet');
  var deployId = newRecord.getFieldValue('custbody_cr8_source_deployment');
  var end_date = newRecord.getFieldValue('custbody_inv_date_range_to');
  var start_date = newRecord.getFieldValue('custbody_inv_date_range_from');
  var franchisee = newRecord.getFieldValue('partner');
  // WS Edit 1605XX: 1.
  var invtype = newRecord.getFieldValue('custbody_inv_type');
  if (!isNullorEmpty(invtype)) {
    invtype = parseInt(invtype);
  }

  // nlapiLogExecution('DEBUG', 'After Submit Context ', nlapiGetContext().getExecutionContext());
  // nlapiLogExecution('DEBUG', 'After Submit Context ', type);
  //
  //
  // if (nlapiGetContext().getExecutionContext() == 'userinterface' && type ==
  //   'edit') {
  //   addSurcharges(newRecord, invtype, newCustId);
  // }


  //Will to advice how to pass parameter from Suitelet to afterSubmit URL. Current implementation is a workaround.

  if (type == 'edit') {
    if (checkCustomerIsFranchisee(newCustId) || checkHeadOfficeCustomer(
        newCustId) || checkCompanyTerritory(newCustId)) {
      deleteVendorBill(newRecord.getId());
    } else if (checkRecordChanged(newRecord, oldRecord)) {
      // WS Edit 1605XX: 2.
      createVendorBill(newRecord, type, invtype);

    }

  }

  if (type == 'create') {

    // addDiscount(newCustId, newRecord, invtype);

    if (!isNullorEmpty(suitletId) && !isNullorEmpty(deployId)) {

      var params = {
        custscript_customer_id: newCustId,
        custscript_invoiceid: nlapiGetRecordId(),
        custscript_service_start_date: start_date,
        custscript_service_end_date: end_date,
        custscript_zee: franchisee,
        custscript_from_invoice: 'Yes'
      }

      var status = nlapiScheduleScript('customscript_sc_invoice_creation',
        'customdeploy_adhoc', params);

      if (status == 'QUEUED') {
        var searchedJobsExtras = nlapiLoadSearch('customrecord_job',
          'customsearch_job_inv_review_exp_amt');

        var filPo = [];
        filPo[filPo.length] = new nlobjSearchFilter('custrecord_job_customer',
          null, 'noneof', newCustId);
        filPo[filPo.length] = new nlobjSearchFilter(
          'custrecord_job_date_inv_finalised', null, 'isempty');
        filPo[filPo.length] = new nlobjSearchFilter(
          'custrecord_job_date_reviewed', null, 'isempty');
        filPo[filPo.length] = new nlobjSearchFilter('custrecord_job_franchisee',
          null, 'is', franchisee);
        if (!isNullorEmpty(nlapiGetFieldValue('start_date')) && !isNullorEmpty(
            nlapiGetFieldValue('end_date'))) {
          filPo[filPo.length] = new nlobjSearchFilter(
            'custrecord_job_date_scheduled', null, 'onorafter', start_date);
          filPo[filPo.length] = new nlobjSearchFilter(
            'custrecord_job_date_scheduled', null, 'onorbefore', end_date);
        }

        searchedJobsExtras.addFilters(filPo);

        var resultSetExtras = searchedJobsExtras.runSearch();

        var result = resultSetExtras.getResults(0, 1);
        if (result.length != 0) {
          var internalID = result[0].getValue('internalid',
            'CUSTRECORD_JOB_CUSTOMER', 'group');
          var params = new Array();
          params['start_date'] = start_date;
          params['end_date'] = end_date;
          params['customer_id'] = internalID;

          nlapiSetRedirectURL('SUITELET', 'customscript_sl_services_main_page',
            'customdeploy_sl_services_main_page', null, params);

        } else {
          var params = new Array();
          params['start_date'] = start_date;
          params['end_date'] = end_date;

          nlapiSetRedirectURL('SUITELET', 'customscript_sl_summary_page',
            'customdeploy_summary_page', null, params);
        }
      }
    }

    if (!checkCustomerIsFranchisee(newCustId) && !checkHeadOfficeCustomer(
        newCustId) && !checkCompanyTerritory(newCustId)) {
      // WS Edit 1605XX: 2.
      nlapiLogExecution('DEBUG', 'After Submit: Before Creating Vendor Bill ',
        type);
      createVendorBill(newRecord, type, invtype);
    }
  }
}


function checkRecordChanged(newRecord, oldRecord) {
  if (!isNullorEmpty(newRecord.getFieldValue('void'))) return true;
  if (newRecord.getFieldValue('trandate') != oldRecord.getFieldValue('trandate'))
    return true;
  if (newRecord.getFieldValue('partner') != oldRecord.getFieldValue('partner'))
    return true;
  if (newRecord.getFieldValue('location') != oldRecord.getFieldValue('location'))
    return true;
  if (newRecord.getFieldValue('department') != oldRecord.getFieldValue(
      'department')) return true;
  if (newRecord.getFieldValue('total') != oldRecord.getFieldValue('total'))
    return true;
  if (newRecord.getFieldValue('taxtotal') != oldRecord.getFieldValue('taxtotal'))
    return true;
  if (newRecord.getFieldValue('entity') != oldRecord.getFieldValue('entity'))
    return true;
  if (newRecord.getLineItemCount('item') != oldRecord.getLineItemCount('item')) {
    return true;
  } else {
    for (n = 1; n <= newRecord.getLineItemCount('item'); n++) {
      if (newRecord.getLineItemValue('item', 'item', n) != oldRecord.getLineItemValue(
          'item', 'item', n)) return true;
      if (newRecord.getLineItemValue('item', 'quantity', n) != oldRecord.getLineItemValue(
          'item', 'quantity', n)) return true;
      if (newRecord.getLineItemValue('item', 'rate', n) != oldRecord.getLineItemValue(
          'item', 'rate', n)) return true;
      if (newRecord.getLineItemValue('item', 'amount', n) != oldRecord.getLineItemValue(
          'item', 'amount', n)) return true;
      if (newRecord.getLineItemValue('item', 'taxcode', n) != oldRecord.getLineItemValue(
          'item', 'taxcode', n)) return true;
      if (newRecord.getLineItemValue('item', 'taxamount', n) != oldRecord.getLineItemValue(
          'item', 'taxamount', n)) return true;
    }
  }
  return false;
}

/**
 * Function returns true if the customer is also a franchisee.
 *
 * @param {Object} recId
 */
function checkCustomerIsFranchisee(custId) {
  var filters = [new nlobjSearchFilter('internalid', null, 'is', custId)];
  var columns = [new nlobjSearchColumn('companyname')];
  var searchresults = nlapiSearchRecord('partner', null, filters, columns);
  if (isNullorEmpty(searchresults)) {
    return false;
  } else {
    return true;
  }
}
/**
 * WS Notes:
 *
 * [checkHeadOfficeCustomer returns true if Customer rec no franchisee]
 * @param  {integer} custId [customer rec internal id]
 * @return {boolean}        [true if customer rec no franchisee]
 */
function checkHeadOfficeCustomer(custId) {
  if (isNullorEmpty(nlapiLookupField('customer', custId, 'partner'))) {
    return true;
  } else return false;
}


/**
 * WS Notes:
 *
 * [checkCompanyTerritory returns true if owned by company owned territory]
 * @param  {integer} custId [customer rec internal id]
 * @return {boolean}        [true if partner on customer rec is 'Company-Owned Territory']
 */
function checkCompanyTerritory(custId) {
  var partner = nlapiLookupField('customer', custId, 'partner');
  if (!isNullorEmpty(partner) && nlapiLookupField('partner', partner,
      'custentity_company_territory') == "T") {
    return true;
  } else return false;
}

/**
 * Delete any Vendor Bill associated to the invoice.
 *
 * @param {Object} recId
 */
function deleteVendorBill(recId) {
  // Search for any assocated Bill.
  var billFilters = new Array();
  billFilters[0] = new nlobjSearchFilter('mainline', null, 'is', 'T');
  billFilters[1] = new nlobjSearchFilter('custbody_invoice_reference', null,
    'anyof', recId);
  var billSearch = nlapiSearchRecord('vendorbill', null, billFilters, null);

  nlapiLogExecution('debug', 'Vendor Bill deletion',
    'Total Vendor Bills found : ' + (isNullorEmpty(billSearch) ? 0 :
      billSearch.length));

  // Delete any associated Bill (there should only be one).
  for (var i = 0; !isNullorEmpty(billSearch) && i < billSearch.length; i++) {
    nlapiDeleteRecord('vendorbill', billSearch[i].getId());
    nlapiLogExecution('debug', 'Vendor Bill deletion', 'Vendor Bill removed : ' +
      billSearch[i].getId());
  }
}


/**
 * WS Notes:
 *
 * [createVendorBill creates the Vendor Bill]
 * @param  {object} record  [invoice record]
 * @param  {string} type    [type of record interaction]
 * @param  {integer} invtype [invoice type on invoice rec]
 * @return {[type]}         [return vbill]
 *
 * WS Edit:
 * 1605XX:
 * 1. Send "> 1 Bill" email alert to WS
 * 2. Add invtype parameter
 * 3. create zeeOnBill variable for initialising partner value on Bill to be created
 * 4. set zeeOnBill variable dependent on invtype parameter: if invtype is 5 (AP Product), derive partner (& location & department) from customer rec otherwise from new invoice record.
 * 5. replace all "record.getFieldValue('partner')" to zeeOnBill variable
 *
 */

// WS Edit 1605XX: 2.
function createVendorBill(record, type, invtype) {

  var billId = null;
  var vBillRecord = null;
  var invID = record.getId();
  var vbill = null;

  // WS Edit 1605XX: new variables
  var custId = record.getFieldValue('entity');
  var zeeOnBill = null;
  var location = null;
  var department = null;

  nlapiLogExecution('DEBUG', 'Create Vendor BILL ', nlapiGetContext().getExecutionContext());
  nlapiLogExecution('DEBUG', 'type ', type);
  nlapiLogExecution('DEBUG', 'invtype ', invtype);

  // WS Edit 1605XX: 4.
  // if invtype is 5 (AP Product), derive partner from customer rec otherwise from new invoice record.
  if (invtype == 5 || invtype == 8 || invtype == 9 || invtype == 10) {
    // set partner variable to partner on Customer record
    zeeOnBill = nlapiLoadRecord('customer', custId).getFieldValue('partner');
    // WS !!!: need to set location and dept.
    location = nlapiLoadRecord('partner', zeeOnBill).getFieldValue('location');
    department = nlapiLoadRecord('partner', zeeOnBill).getFieldValue(
      'department');

  } else {
    // set partner variable to partner on Invoice record (i.e record)
    zeeOnBill = record.getFieldValue('partner');
    location = record.getFieldValue('location');
    department = record.getFieldValue('department');
  }


  if (type == 'edit') {
    var billFilters = [new nlobjSearchFilter('mainline', null, 'is', 'T'), new nlobjSearchFilter(
      'custbody_invoice_reference', null, 'anyof', record.getId())];
    var billSearch = nlapiSearchRecord('vendorbill', null, billFilters, null);
    if (!isNullorEmpty(billSearch)) {
      if (billSearch.length > 1) {
        // WS Edit 1605XX: 1.
        nlapiSendEmail(58097, 58097, 'Invoice Franchisee Commission Error',
          'Invoice Internal ID: ' + invID + '. Bill Count: ' + billSearch.length
        );
      }
      billId = billSearch[0].getId();
    }
  }
  if (!isNullorEmpty(billId)) {
    vBillRecord = nlapiLoadRecord('vendorbill', billId);
  } else {
    vBillRecord = nlapiCreateRecord('vendorbill');
  }

  // grab the % commission from the franchisee record.
  // WS Edit 1605XX: 5.
  var otherComRate = nlapiLookupField('partner', zeeOnBill,
    'custentity_inv_commission_other');

  // determine whether the franchisee is entitled to double commission on toll products (legacy issue)
  var productCommMultiplier = 1;
  // WS Edit 1605XX: 5.
  if (nlapiLookupField('partner', zeeOnBill,
      'custentity_toll_double_commission') == "T") {
    productCommMultiplier = 2;
  }

  // WS Notes: 'custscriptcustscript_comm_ap_account' customer script parameter
  // Get the default AP account.
  var defaultAccount = nlapiGetContext().getSetting('SCRIPT',
    'custscriptcustscript_comm_ap_account');

  var bFilters = [];
  bFilters[bFilters.length] = new nlobjSearchFilter('mainline', null, 'is', "F");
  bFilters[bFilters.length] = new nlobjSearchFilter('taxline', null, 'is', "F");
  bFilters[bFilters.length] = new nlobjSearchFilter('cogs', null, 'is', "F");
  bFilters[bFilters.length] = new nlobjSearchFilter('internalid', null, 'is',
    invID);

  var bColumns = [];
  bColumns[bColumns.length] = new nlobjSearchColumn('quantity');
  bColumns[bColumns.length] = new nlobjSearchColumn('item');
  bColumns[bColumns.length] = new nlobjSearchColumn('rate');
  bColumns[bColumns.length] = new nlobjSearchColumn('custitem_commission_model',
    'item');
  bColumns[bColumns.length] = new nlobjSearchColumn('custitem_commission_rate',
    'item');
  bColumns[bColumns.length] = new nlobjSearchColumn(
    'custitem_commission_account', 'item');
  bColumns[bColumns.length] = new nlobjSearchColumn(
    'custitem_toll_double_commission', 'item');
  bColumns[bColumns.length] = new nlobjSearchColumn('class', 'item');
  bColumns[bColumns.length] = new nlobjSearchColumn('amount');
  bColumns[bColumns.length] = new nlobjSearchColumn('taxcode');
  bColumns[bColumns.length] = new nlobjSearchColumn('taxamount');

  var bSearchResults = nlapiSearchRecord('invoice', null, bFilters, bColumns);

  for (p = 1; p <= vBillRecord.getLineItemCount('expense'); p++) {
    vBillRecord.removeLineItem('expense', p);
  }

  // Set the line count.
  var nLine = 1;

  // Create the vendor bill and fill in the header details. Ensure to update the invoice reference.
  vBillRecord.setFieldValue('trandate', record.getFieldValue('trandate'));
  // WS Edit 1605XX: 5.
  vBillRecord.setFieldValue('entity', zeeOnBill);
  vBillRecord.setFieldValue('account', defaultAccount);
  vBillRecord.setFieldValue('custbody_invoice_reference', record.getFieldValue(
    'id'));
  vBillRecord.setFieldValue('location', location);
  if (!isNullorEmpty(department)) {
    vBillRecord.setFieldValue('department', department);
  }
  vBillRecord.setFieldValue('custbody_invoicetotal', record.getFieldValue(
    'total'));
  vBillRecord.setFieldValue('custbody_taxtotal', record.getFieldValue(
    'taxtotal'));
  // WS Edit 1605XX: 5.
  vBillRecord.setFieldValue('custbody_related_franchisee', zeeOnBill);
  vBillRecord.setFieldValue('custbody_invoice_customer', custId);
  if (invtype == 8) {
    vBillRecord.setFieldValue('custbody_related_inv_type', 8);
  } else if (invtype == 9) {
    vBillRecord.setFieldValue('custbody_related_inv_type', 9);
  }

  var inv_total = 0.00;
  var cogs_total = 0.00;

  nlapiLogExecution('DEBUG', 'zeeOnBill ', zeeOnBill);

  //Subsides rates if Sendle Invoice & franchisee is Arncliffe or Rouse Hill or Airport West or Waterloo or Melbourne CBD
  if (invtype == 9) {
    nlapiLogExecution('DEBUG', 'Inside Sendle Subsidised Rates Creation ', '');
    for (b = 0; !isNullorEmpty(bSearchResults) && b < bSearchResults.length; b++) {
      var partner_comm_rate = bSearchResults[b].getValue(
        'custitem_commission_rate', 'item');
      if (isNullorEmpty(partner_comm_rate)) {
        partner_comm_rate = 0.0;
      }
      nlapiLogExecution('DEBUG', 'partner_comm_rate ', partner_comm_rate);

      vBillRecord.setLineItemValue('expense', 'account', nLine, bSearchResults[
          b]
        .getValue('custitem_commission_account', 'item'));
      vBillRecord.setLineItemValue('expense', 'taxcode', nLine, bSearchResults[
          b]
        .getValue('taxcode'));
      // Line item is Sendle: Parcel Pick (No Commissions) (TOLL)
      if (bSearchResults[b].getValue('item') == 9570) {
        vBillRecord.setLineItemValue('expense', 'memo', nLine, '' +
          bSearchResults[
            b].getValue('quantity') + ' x ' + bSearchResults[b].getText(
            'item') +
          ' @ $' + bSearchResults[b].getValue('rate'));
      } else if (bSearchResults[b].getValue('item') == 9571 || bSearchResults[b]
        .getValue('item') == 9572) {
        //Line item is Sendle: Jobs (1-5 Parcels) (TOLL) or Sendle: Jobs (6+ Parcels) (TOLL)
        vBillRecord.setLineItemValue('expense', 'memo', nLine, '' +
          bSearchResults[
            b].getValue('quantity') + ' x ' + bSearchResults[b].getText(
            'item') +
          ' @ $' + partner_comm_rate);
      }
      vBillRecord.setLineItemValue('expense', 'class', nLine, bSearchResults[b]
        .getValue(
          'class', 'item'));

      vBillRecord.setLineItemValue('expense', 'isbillable', nLine, 'F');

      var calcAmt = 0.00;

      nlapiLogExecution('DEBUG', 'Quantity ', bSearchResults[b].getValue(
        'quantity'));

      if (bSearchResults[b].getValue('item') == 9575) {
        if (zeeOnBill == 5386) {
          partner_comm_rate = 1.0; //Arncliffe Franchisee
        } else {
          partner_comm_rate = 0.5; // All Other Franchisees
        }
        vBillRecord.setLineItemValue('expense', 'memo', nLine, '' +
          bSearchResults[
            b].getValue('quantity') + ' x ' + bSearchResults[b].getText(
            'item') +
          ' @ $' + partner_comm_rate);
      }
      calcAmt = parseFloat(bSearchResults[b].getValue('quantity')) * parseFloat(
        partner_comm_rate);

      nlapiLogExecution('DEBUG', 'calcAmt ', calcAmt);

      vBillRecord.setLineItemValue('expense', 'amount', nLine,
        nlapiFormatCurrency(calcAmt));
      nLine++;

      if (parseInt(bSearchResults[b].getValue('class', 'item')) == 9) {
        cogs_total += parseFloat(bSearchResults[b].getValue('amount'));
      } else {
        inv_total += parseFloat(bSearchResults[b].getValue('amount')) +
          parseFloat(bSearchResults[b].getValue('taxamount'));
      }
    }
  } else {
    nlapiLogExecution('DEBUG', 'Inside Normal ', '');
    for (b = 0; !isNullorEmpty(bSearchResults) && b < bSearchResults.length; b++) {
      vBillRecord.setLineItemValue('expense', 'account', nLine, bSearchResults[
          b]
        .getValue('custitem_commission_account', 'item'));
      vBillRecord.setLineItemValue('expense', 'taxcode', nLine, bSearchResults[
          b]
        .getValue('taxcode'));
      vBillRecord.setLineItemValue('expense', 'memo', nLine, '' +
        bSearchResults[
          b].getValue('quantity') + ' x ' + bSearchResults[b].getText('item') +
        ' @ $' + bSearchResults[b].getValue('rate'));
      vBillRecord.setLineItemValue('expense', 'class', nLine, bSearchResults[b]
        .getValue(
          'class', 'item'));
      vBillRecord.setLineItemValue('expense', 'isbillable', nLine, 'F');
      var calcAmt = 0.00;
      //Ankith - To check if Partner Commission Rate on NS Item is Null or Not
      var partner_comm_rate = bSearchResults[b].getValue(
        'custitem_commission_rate', 'item');
      //If Null Set value to 0
      if (isNullorEmpty(partner_comm_rate)) {
        partner_comm_rate = 0.0;
      }
      if (parseInt(bSearchResults[b].getValue('custitem_commission_model',
          'item')) ==
        1) {
        calcAmt = parseFloat(bSearchResults[b].getValue('quantity')) *
          parseFloat(
            partner_comm_rate);
      } else if (parseInt(bSearchResults[b].getValue(
          'custitem_commission_model',
          'item')) == 2) {
        calcAmt = parseFloat(bSearchResults[b].getValue('amount')) * parseFloat(
          partner_comm_rate) / 100;
      } else if (parseInt(bSearchResults[b].getValue(
          'custitem_commission_model',
          'item')) == 5) {
        calcAmt = parseFloat(bSearchResults[b].getValue('amount')) * parseFloat(
          otherComRate) / 100;
      } else if (parseInt(bSearchResults[b].getValue(
          'custitem_commission_model',
          'item')) == 6) {
        calcAmt = parseFloat(bSearchResults[b].getValue('amount'));
      }
      if (bSearchResults[b].getValue('custitem_toll_double_commission', 'item') ==
        "T") {
        calcAmt = calcAmt * productCommMultiplier;
      }
      vBillRecord.setLineItemValue('expense', 'amount', nLine,
        nlapiFormatCurrency(calcAmt));
      nLine++;
      if (parseInt(bSearchResults[b].getValue('class', 'item')) == 9) {
        cogs_total += parseFloat(bSearchResults[b].getValue('amount'));
      } else {
        inv_total += parseFloat(bSearchResults[b].getValue('amount')) +
          parseFloat(bSearchResults[b].getValue('taxamount'));
      }
    }
  }


  vBillRecord.setFieldValue('custbody_cogstotal', nlapiFormatCurrency(
    cogs_total));
  vBillRecord.setFieldValue('custbody_invoicetotal', nlapiFormatCurrency(
    inv_total));
  vbill = nlapiSubmitRecord(vBillRecord, true);

  nlapiLogExecution('DEBUG', 'vbill ', vbill);

  var reloadedBill = nlapiLoadRecord('vendorbill', vbill);
  reloadedBill.setFieldValue('tranid', vbill);
  nlapiSubmitRecord(reloadedBill, true);

  return vbill;
}

function setTranDate(start_date, end_date) {
  // Set the transaction date field.
  var dDate = new Date();

  dDate = parseFloat(dDate.getDate()) > 15 ? getEndOfMonth(dDate) :
    getEndOfLastMonth(dDate);
  nlapiSetFieldValue('trandate', nlapiDateToString(dDate));

  if (!isNullorEmpty(start_date) && !isNullorEmpty(end_date)) {
    nlapiSetFieldValue('custbody_inv_date_range_to', (end_date));
    nlapiSetFieldValue('custbody_inv_date_range_from', (start_date));
  } else {
    nlapiSetFieldValue('custbody_inv_date_range_to', nlapiDateToString(dDate));
    nlapiSetFieldValue('custbody_inv_date_range_from', nlapiDateToString(
      getStartOfMonth(dDate)));
  }


  var filters = [];
  filters[0] = new nlobjSearchFilter('isquarter', null, 'is', 'F');
  filters[1] = new nlobjSearchFilter('isyear', null, 'is', 'F');
  filters[2] = new nlobjSearchFilter('isadjust', null, 'is', 'F');
  filters[3] = new nlobjSearchFilter('startdate', null, 'onorbefore',
    nlapiDateToString(dDate));
  filters[4] = new nlobjSearchFilter('enddate', null, 'onorafter',
    nlapiDateToString(dDate));
  var periodSearch = nlapiSearchRecord('accountingperiod', null, filters, new nlobjSearchColumn(
    'periodname'));
  if (!isNullorEmpty(periodSearch)) {
    nlapiSetFieldValue('postingperiod', periodSearch[0].getId());
  }
}

function loadItem(id) {
  var CONST_ITEMTYPE = {
    'Assembly': 'assemblyitem',
    'Description': 'descriptionitem',
    'Discount': 'discountitem',
    'GiftCert': 'giftcertificateitem',
    'InvtPart': 'inventoryitem',
    'Group': 'itemgroup',
    'Kit': 'kititem',
    'Markup': 'markupitem',
    'NonInvtPart': 'noninventoryitem',
    'OthCharge': 'otherchargeitem',
    'Payment': 'paymentitem',
    'Service': 'serviceitem',
    'Subtotal': 'subtotalitem'
  };

  try {
    return nlapiLoadRecord(CONST_ITEMTYPE[nlapiLookupField('item', id, 'type')],
      id);
  } catch (e) {
    nlapiLogExecution('ERROR', 'loadItem failed with error: id:' + id, e.message)
  };
};
