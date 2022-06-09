/**
 * @Author: Ankith Ravindran <ankithravindran>
 * @Date:   2022-06-08T09:15:10+10:00
 * @Filename: mp_ss_credit_memo.js
 * @Last modified by:   ankithravindran
 * @Last modified time: 2022-06-10T07:57:15+10:00
 */


var newCreditSubTotal = 0.0;

/**
 * Remove the label to hide fields.
 *
 * @param {Object} type
 * @param {Object} form
 */
function beforeLoad(type, form) {

  //WS Edit: set AP Product Order to null to prevent AP Product Order to be copied from Invoice
  if (type == 'create') {
    var record = nlapiGetNewRecord();
    record.setFieldValue('custbody_ap_product_order', null);
  }

  if (type == 'edit') {
    var recId = nlapiGetRecordId();

    //To check if the credit memo is fully applied, and if yes to lock the record. Only available to System Support and Administrator and Product Manager
    if (!isNullorEmpty(recId)) {
      var credit_memo_record = nlapiLoadRecord('creditmemo', recId);

      var bill_credit_of_credit_memo = credit_memo_record.getFieldValue(
        'custbody_bill_credit');

      if (!isNullorEmpty(bill_credit_of_credit_memo)) {
        var bill_credit_record = nlapiLoadRecord('vendorcredit',
          bill_credit_of_credit_memo);

        var bill_credit_applied_amount = bill_credit_record.getFieldValue(
          'applied');


        if (nlapiGetRole() != 1032 && nlapiGetRole() != 3 && nlapiGetRole() !=
          1023) {

          if (bill_credit_applied_amount > 0) {
            throw nlapiCreateError('RECORD_LOCKED',
              'Record Locked: \n\nThe Credit Memo has been Fully Applied',
              true);
          }
        }
      }
    }
  }


  if (type != 'print' && type != 'email') {

    form.getField('custbody_invoice_reference').setDisplayType('hidden');
    form.getField('custbody_related_franchisee').setDisplayType('hidden');
    form.getField('custbody_invoice_customer').setDisplayType('hidden');
  }
}

function beforeSubmit(type) {

  var recId = nlapiGetRecordId();
  var rec = nlapiGetNewRecord();
  var recOld = nlapiGetOldRecord();

  if (type == 'delete') {
    // Establish the record of concern.
    var recId = nlapiGetRecordId();
    if (!isNullorEmpty(recId)) {
      deleteBillCredit(recId);
    }
  }
  //WS Edit: mandate ap product order if Invoice Type == AP Products
  if (type == 'create' || type == 'edit') {

    if (type == 'create') {
      var record = nlapiGetNewRecord();
    } else {
      var record = nlapiGetNewRecord();
      checkInvLineItem(record, type);
    }

    // var applyFuelSurcharge = record.getFieldValue(
    //   'custbody_apply_fuel_surcharge');

    var customerID = record.getFieldValue('entity');
    var customerRecord = nlapiLoadRecord('customer', customerID);

    var service_fuel_surcharge = customerRecord.getFieldValue(
      'custentity_service_fuel_surcharge');
    var service_fuel_surcharge_rate = customerRecord.getFieldValue(
      'custentity_service_fuel_surcharge_percen');

    var mpex_surcharge = customerRecord.getFieldValue(
      'custentity_mpex_surcharge');
    var mpex_surcharge_rate = customerRecord.getFieldValue(
      'custentity_mpex_surcharge_rate');

    // nlapiLogExecution('DEBUG', 'applyFuelSurcharge', applyFuelSurcharge);

    if (service_fuel_surcharge == 1 || mpex_surcharge == 1) {
      var creditSubtotal = record.getFieldValue('subtotal');
      var invoiceId = record.getFieldValue('createdfrom');
      var rec = nlapiLoadRecord('invoice', invoiceId);
      var invtype = rec.getFieldValue('custbody_inv_type');
      var manual_surcharge_applied = rec.getFieldValue(
        'custbody_inv_manual_surcharge');
      var fuel_surcharge_applied = rec.getFieldValue(
        'custbody_inv_fuel_surcharge');

      nlapiLogExecution('DEBUG', 'invtype', invtype);
      nlapiLogExecution('DEBUG', 'manual_surcharge_applied',
        manual_surcharge_applied);
      nlapiLogExecution('DEBUG', 'fuel_surcharge_applied',
        fuel_surcharge_applied);
      nlapiLogExecution('DEBUG', 'mpex_surcharge', mpex_surcharge);
      nlapiLogExecution('DEBUG', 'mpex_surcharge_rate', mpex_surcharge_rate);
      nlapiLogExecution('DEBUG', 'service_fuel_surcharge',
        service_fuel_surcharge);
      nlapiLogExecution('DEBUG', 'service_fuel_surcharge_rate',
        service_fuel_surcharge_rate);

      if (invtype == 8) {
        if (mpex_surcharge == 1 || mpex_surcharge == '1') {
          //Applying Shipping Surcharge at a flat rate
          if (manual_surcharge_applied == 1 || manual_surcharge_applied == '1') {
            //Additonal 7.5% if all barcodes used in the invoicing period is manual
            mpex_surcharge_rate = parseFloat(mpex_surcharge_rate) + 7.5;
          }

          var surcharge_rate = 0;
          surcharge_rate = creditSubtotal * (mpex_surcharge_rate / 100);

          record.selectNewLineItem('item');
          record.setCurrentLineItemValue('item', 'item', 9577);
          record.setCurrentLineItemValue('item', 'rate', surcharge_rate);
          record.setCurrentLineItemValue('item', 'quantity', 1);
          record.commitLineItem('item');

        } else {
          //Applying MPEX Surcharge based on the tiered percentage based on the invoice value.
          if (manual_surcharge_applied == 1 || manual_surcharge_applied == '1') {
            //All barcodes used in the invoicing period is manual
            var surcharge_rate = 0;

            if (creditSubtotal < 250) {
              surcharge_rate = creditSubtotal * (16.7 / 100)
            } else if (creditSubtotal >= 250 && invoiceSubtotal <= 1250) {
              surcharge_rate = creditSubtotal * (12.7 / 100)
            } else if (creditSubtotal > 1250) {
              surcharge_rate = creditSubtotal * (9.7 / 100)
            }

            record.selectNewLineItem('item');
            record.setCurrentLineItemValue('item', 'item', 9568);
            record.setCurrentLineItemValue('item', 'rate', surcharge_rate);
            record.setCurrentLineItemValue('item', 'quantity', 1);
            record.commitLineItem('item');
          } else if (fuel_surcharge_applied == 1 || fuel_surcharge_applied ==
            '1') {
            var surcharge_rate = 0;

            if (invoiceSubtotal < 250) {
              surcharge_rate = creditSubtotal * (9.2 / 100)
            } else if (invoiceSubtotal >= 250 && invoiceSubtotal <= 1250) {
              surcharge_rate = creditSubtotal * (5.2 / 100)
            } else if (invoiceSubtotal > 1250) {
              surcharge_rate = creditSubtotal * (2.2 / 100)
            }

            record.selectNewLineItem('item');
            record.setCurrentLineItemValue('item', 'item', 9568);
            record.setCurrentLineItemValue('item', 'rate', surcharge_rate);
            record.setCurrentLineItemValue('item', 'quantity', 1);
            record.commitLineItem('item');
          }
        }
      } else if ((isNullorEmpty(invtype) || invtype == 'NaN')) {

        nlapiLogExecution('DEBUG', 'service_fuel_surcharge',
          service_fuel_surcharge)
        //Applying Service Fuel Surcharge
        if (service_fuel_surcharge == '1' || service_fuel_surcharge == 1) {

          var surcharge_rate = 0;
          surcharge_rate = creditSubtotal * (service_fuel_surcharge_rate /
            100);

          if (newCreditSubTotal == 0.0) {
            surcharge_rate = creditSubtotal * (service_fuel_surcharge_rate /
              100);
          } else {
            surcharge_rate = newCreditSubTotal * (service_fuel_surcharge_rate /
              100);
          }

          nlapiLogExecution('DEBUG', 'surcharge_rate',
            surcharge_rate)

          record.selectNewLineItem('item');
          record.setCurrentLineItemValue('item', 'item', 9565);
          record.setCurrentLineItemValue('item', 'rate', surcharge_rate);
          record.setCurrentLineItemValue('item', 'quantity', 1);
          record.commitLineItem('item');
        }
      }

      // nlapiSubmitRecord(record, true);
    }

    if (record.getFieldValue('custbody_inv_type') == 5) { //AP Products

      if (isNullorEmpty(record.getFieldValue('custbody_ap_product_order'))) {

        throw nlapiCreateError('INCOMPLETE_RECORD',
          'Incomplete Record: Missing required AP Product Return for AP Product Credit Memo.\n\nPlease ensure that the correct AP Product Return is quoted.',
          true);
      }
    }
  }
}

function checkInvLineItem(rec, type) {

  var oldCreditSubototal = rec.getFieldValue('subtotal');
  var applyFuelSurcharge = rec.getFieldValue('custbody_apply_fuel_surcharge');

  for (n = 1; n <= rec.getLineItemCount('item'); n++) {
    var itemn = rec.getLineItemValue('item', 'item', n);

    if (itemn == 9565 && nlapiGetContext().getExecutionContext() ==
      'userinterface' && type ==
      'edit') {
      newCreditSubTotal = oldCreditSubototal - parseFloat(rec.getLineItemValue(
        'item', 'rate', n))
      nlapiLogExecution('DEBUG', 'remove fuel surcharge')
      rec.removeLineItem('item', n);
    }

  }
}

/**
 * Create a vendor credit for the commission amount for all available items when 'create bill credit' is checked.
 * 1. Create a vendor credit based on the vendors commission structure (it is assumed that the commission structure hasn't changed).
 * 2. Update the credit memo unchecking 'create bill credit' and bill credit link.
 *
 * @param {Object} type
 */
function afterSubmit(type) {
  if (type == 'edit') {
    // Establish the record of concern.
    var recId = nlapiGetRecordId();

    if (!isNullorEmpty(recId)) {
      var record = nlapiLoadRecord('creditmemo', recId);
      if (!isNullorEmpty(record) && record.getFieldValue(
        'custbody_create_bill_credit') == 'T') {
        var custId = record.getFieldValue('entity');
        if (!checkCustomerIsFranchisee(custId) && !checkHeadOfficeCustomer(
          custId) && !checkCompanyTerritory(custId)) {
          if (isNullorEmpty(record.getFieldValue('custbody_bill_credit'))) {
            billCredId = createBillCredit(record);
            if (!isNullorEmpty(billCredId)) {
              record.setFieldValue('custbody_bill_credit', billCredId);
              var rtnId = nlapiSubmitRecord(record, true);
            }
          } else {
            billCredId = editBillCredit(record);
          }

        }
      }

    }
  }

  if (type == 'create') {
    // Establish the record of concern.
    var recId = nlapiGetRecordId();
    if (!isNullorEmpty(recId)) {
      var record = nlapiLoadRecord('creditmemo', recId);
      if (!isNullorEmpty(record) && record.getFieldValue(
        'custbody_create_bill_credit') == 'T') {
        var custId = record.getFieldValue('entity');
        if (!checkCustomerIsFranchisee(custId) && !checkHeadOfficeCustomer(
          custId) && !checkCompanyTerritory(custId)) {
          billCredId = createBillCredit(record, type);
          if (!isNullorEmpty(billCredId)) {
            record.setFieldValue('custbody_bill_credit', billCredId);
            var rtnId = nlapiSubmitRecord(record, true);
          }
        }
      }
    }
  }
}

function createBillCredit(record) {
  var recId = record.getId();
  var vcred = null;
  // grab the franchisee (partner) % commission.
  var otherComRate = nlapiLookupField('partner', record.getFieldValue('partner'),
    'custentity_inv_commission_other');

  //determine whether the franchisee is entitled to double commission on toll products (legacy)
  var productCommMultiplier = 1;
  if (nlapiLookupField('partner', record.getFieldValue('partner'),
    'custentity_toll_double_commission') == "T") {
    productCommMultiplier = 2;
  }

  var bFilters = [];
  bFilters[bFilters.length] = new nlobjSearchFilter('mainline', null, 'is', 'F');
  bFilters[bFilters.length] = new nlobjSearchFilter('taxline', null, 'is', 'F');
  bFilters[bFilters.length] = new nlobjSearchFilter('cogs', null, 'is', 'F');
  bFilters[bFilters.length] = new nlobjSearchFilter('internalid', null, 'is',
    recId);

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

  var bSearchResults = nlapiSearchRecord('creditmemo', null, bFilters, bColumns);

  // Set the line count.
  var nLine = 1;

  // Create a vendor credit.
  var vCreditRecord = nlapiCreateRecord('vendorcredit');
  vCreditRecord.setFieldValue('trandate', record.getFieldValue('trandate'));
  vCreditRecord.setFieldValue('entity', record.getFieldValue('partner'));
  vCreditRecord.setFieldValue('account', 128);
  vCreditRecord.setFieldValue('custbody_invoice_reference', record.getFieldValue(
    'custbody_invoice_reference'));
  vCreditRecord.setFieldValue('custbody_credit_memo_reference', record.getFieldValue(
    'id'));
  vCreditRecord.setFieldValue('location', record.getFieldValue('location'));
  vCreditRecord.setFieldValue('department', record.getFieldValue('department'));
  vCreditRecord.setFieldValue('custbody_invoice_customer', record.getFieldValue(
    'custbody_invoice_customer'));
  vCreditRecord.setFieldValue('memo', record.getFieldValue('memo'));
  vCreditRecord.setFieldValue('custbody_related_franchisee', record.getFieldValue(
    'partner'));

  for (b = 0; !isNullorEmpty(bSearchResults) && b < bSearchResults.length; b++) {
    vCreditRecord.setLineItemValue('expense', 'account', nLine, bSearchResults[
      b].getValue('custitem_commission_account', 'item'));
    vCreditRecord.setLineItemValue('expense', 'taxcode', nLine, bSearchResults[
      b].getValue('taxcode'));
    vCreditRecord.setLineItemValue('expense', 'memo', nLine, '' +
      bSearchResults[b].getValue('quantity') + ' x ' + bSearchResults[b].getText(
        'item') + ' @ $' + bSearchResults[b].getValue('rate'));
    vCreditRecord.setLineItemValue('expense', 'class', nLine, bSearchResults[b]
      .getValue('class', 'item'));
    var calcAmt = 0.00;
    if (parseInt(bSearchResults[b].getValue('custitem_commission_model', 'item')) ==
      1) {
      calcAmt = parseFloat(bSearchResults[b].getValue('quantity')) * parseFloat(
        bSearchResults[b].getValue('custitem_commission_rate', 'item'));
    } else if (parseInt(bSearchResults[b].getValue('custitem_commission_model',
      'item')) == 2) {
      calcAmt = parseFloat(bSearchResults[b].getValue('amount')) * parseFloat(
        bSearchResults[b].getValue('custitem_commission_rate', 'item')) / 100;
    } else if (parseInt(bSearchResults[b].getValue('custitem_commission_model',
      'item')) == 5) {
      calcAmt = parseFloat(bSearchResults[b].getValue('amount')) * parseFloat(
        otherComRate) / 100;
    } else if (parseInt(bSearchResults[b].getValue('custitem_commission_model',
      'item')) == 6) {
      calcAmt = parseFloat(bSearchResults[b].getValue('amount'));
    }
    if (bSearchResults[b].getValue('custitem_toll_double_commission', 'item') ==
      "T") {
      calcAmt = calcAmt * productCommMultiplier;
    }
    vCreditRecord.setLineItemValue('expense', 'amount', nLine,
      nlapiFormatCurrency(0 - calcAmt));
    nLine++;
  }
  var vCredit = nlapiSubmitRecord(vCreditRecord, true);

  var reloadedCredit = nlapiLoadRecord('vendorcredit', vCredit);
  reloadedCredit.setFieldValue('tranid', vCredit);
  nlapiSubmitRecord(reloadedCredit, true);

  return vCredit;
}

function editBillCredit(record) {

  var recId = record.getId();

  var billFilters = new Array();
  billFilters[0] = new nlobjSearchFilter('mainline', null, 'is', 'T');
  billFilters[1] = new nlobjSearchFilter('custbody_credit_memo_reference', null,
    'anyof', recId);
  var billSearch = nlapiSearchRecord('vendorcredit', null, billFilters, null);

  for (var i = 0; !isNullorEmpty(billSearch) && i < billSearch.length; i++) {

    var vcred = null;
    // grab the franchisee (partner) % commission.
    var otherComRate = nlapiLookupField('partner', record.getFieldValue(
      'partner'), 'custentity_inv_commission_other');

    //determine whether the franchisee is entitled to double commission on toll products (legacy)
    var productCommMultiplier = 1;
    if (nlapiLookupField('partner', record.getFieldValue('partner'),
      'custentity_toll_double_commission') == "T") {
      productCommMultiplier = 2;
    }

    var bFilters = [];
    bFilters[bFilters.length] = new nlobjSearchFilter('mainline', null, 'is',
      'F');
    bFilters[bFilters.length] = new nlobjSearchFilter('taxline', null, 'is',
      'F');
    bFilters[bFilters.length] = new nlobjSearchFilter('cogs', null, 'is', 'F');
    bFilters[bFilters.length] = new nlobjSearchFilter('internalid', null, 'is',
      recId);

    var bColumns = [];
    bColumns[bColumns.length] = new nlobjSearchColumn('quantity');
    bColumns[bColumns.length] = new nlobjSearchColumn('item');
    bColumns[bColumns.length] = new nlobjSearchColumn('rate');
    bColumns[bColumns.length] = new nlobjSearchColumn(
      'custitem_commission_model', 'item');
    bColumns[bColumns.length] = new nlobjSearchColumn(
      'custitem_commission_rate', 'item');
    bColumns[bColumns.length] = new nlobjSearchColumn(
      'custitem_commission_account', 'item');
    bColumns[bColumns.length] = new nlobjSearchColumn(
      'custitem_toll_double_commission', 'item');
    bColumns[bColumns.length] = new nlobjSearchColumn('class', 'item');
    bColumns[bColumns.length] = new nlobjSearchColumn('amount');
    bColumns[bColumns.length] = new nlobjSearchColumn('taxcode');
    bColumns[bColumns.length] = new nlobjSearchColumn('taxamount');

    var bSearchResults = nlapiSearchRecord('creditmemo', null, bFilters,
      bColumns);

    // Set the line count.
    var nLine = 1;

    if (type == 'edit') {
      //Load existing Vendor Credit
      var vCreditRecord = nlapiLoadRecord('vendorcredit', billSearch[i].getId());
      vCreditRecord.setFieldValue('tranid', billSearch[i].getId());
    } else {
      // Create a vendor credit.
      var vCreditRecord = nlapiCreateRecord('vendorcredit');
    }

    //Delete previously existing line items in vendor credit on Edit. WOntr trigger on create.
    for (p = 1; p <= vCreditRecord.getLineItemCount('expense'); p++) {
      vCreditRecord.removeLineItem('expense', p);
    }

    vCreditRecord.setFieldValue('trandate', record.getFieldValue('trandate'));
    vCreditRecord.setFieldValue('entity', record.getFieldValue('partner'));
    vCreditRecord.setFieldValue('account', 128);
    vCreditRecord.setFieldValue('custbody_invoice_reference', record.getFieldValue(
      'custbody_invoice_reference'));
    vCreditRecord.setFieldValue('custbody_credit_memo_reference', record.getFieldValue(
      'id'));
    vCreditRecord.setFieldValue('location', record.getFieldValue('location'));
    vCreditRecord.setFieldValue('department', record.getFieldValue('department'));
    vCreditRecord.setFieldValue('custbody_invoice_customer', record.getFieldValue(
      'custbody_invoice_customer'));
    vCreditRecord.setFieldValue('memo', record.getFieldValue('memo'));
    vCreditRecord.setFieldValue('custbody_related_franchisee', record.getFieldValue(
      'partner'));

    for (b = 0; !isNullorEmpty(bSearchResults) && b < bSearchResults.length; b++) {
      vCreditRecord.setLineItemValue('expense', 'account', nLine,
        bSearchResults[b].getValue('custitem_commission_account', 'item'));
      vCreditRecord.setLineItemValue('expense', 'taxcode', nLine,
        bSearchResults[b].getValue('taxcode'));
      vCreditRecord.setLineItemValue('expense', 'memo', nLine, '' +
        bSearchResults[b].getValue('quantity') + ' x ' + bSearchResults[b].getText(
          'item') + ' @ $' + bSearchResults[b].getValue('rate'));
      vCreditRecord.setLineItemValue('expense', 'class', nLine, bSearchResults[
        b].getValue('class', 'item'));
      var calcAmt = 0.00;
      if (parseInt(bSearchResults[b].getValue('custitem_commission_model',
        'item')) == 1) {
        calcAmt = parseFloat(bSearchResults[b].getValue('quantity')) *
          parseFloat(bSearchResults[b].getValue('custitem_commission_rate',
            'item'));
      } else if (parseInt(bSearchResults[b].getValue(
        'custitem_commission_model', 'item')) == 2) {
        calcAmt = parseFloat(bSearchResults[b].getValue('amount')) * parseFloat(
          bSearchResults[b].getValue('custitem_commission_rate', 'item')) /
          100;
      } else if (parseInt(bSearchResults[b].getValue(
        'custitem_commission_model', 'item')) == 5) {
        calcAmt = parseFloat(bSearchResults[b].getValue('amount')) * parseFloat(
          otherComRate) / 100;
      } else if (parseInt(bSearchResults[b].getValue(
        'custitem_commission_model', 'item')) == 6) {
        calcAmt = parseFloat(bSearchResults[b].getValue('amount'));
      }
      if (bSearchResults[b].getValue('custitem_toll_double_commission', 'item') ==
        "T") {
        calcAmt = calcAmt * productCommMultiplier;
      }
      vCreditRecord.setLineItemValue('expense', 'amount', nLine,
        nlapiFormatCurrency(0 - calcAmt));
      nLine++;
    }
    var vCredit = nlapiSubmitRecord(vCreditRecord, true);

    if (type != 'edit') {
      var reloadedCredit = nlapiLoadRecord('vendorcredit', vCredit);
      reloadedCredit.setFieldValue('tranid', vCredit);
      nlapiSubmitRecord(reloadedCredit, true);
    }

    return vCredit;
  }

}

function deleteBillCredit(recId) {
  // Search for any assocated Bill Credits.
  var billFilters = new Array();
  billFilters[0] = new nlobjSearchFilter('mainline', null, 'is', 'T');
  billFilters[1] = new nlobjSearchFilter('custbody_credit_memo_reference', null,
    'anyof', recId);
  var billSearch = nlapiSearchRecord('vendorcredit', null, billFilters, null);

  nlapiLogExecution('debug', 'Vendor Credit deletion',
    'Total Vendor Credits found : ' + (isNullorEmpty(billSearch) ? 0 :
      billSearch.length));

  // Delete any associated Bill Credit (there should only be one).
  for (var i = 0; !isNullorEmpty(billSearch) && i < billSearch.length; i++) {
    nlapiDeleteRecord('vendorcredit', billSearch[i].getId());
    nlapiLogExecution('debug', 'Vendor Credit deletion',
      'Vendor Credit removed : ' + billSearch[i].getId());
  }
}

function checkCustomerIsFranchisee(custId) {
  var filters = new Array();
  filters[0] = new nlobjSearchFilter('internalid', null, 'is', custId);

  var columns = new Array();
  columns[0] = new nlobjSearchColumn('companyname');

  var searchresults = nlapiSearchRecord('partner', null, filters, columns);

  if (isNullorEmpty(searchresults)) {
    return false;
  } else {
    return true;
  }
}

function checkHeadOfficeCustomer(custId) {
  var partner = nlapiLookupField('customer', custId, 'partner');
  if (isNullorEmpty(partner)) {
    return true;
  } else if (nlapiLookupField('partner', partner,
    'custentity_company_territory') == "T") {
    return true;
  } else return false;
}

function checkCompanyTerritory(custId) {
  var partner = nlapiLookupField('customer', custId, 'partner');
  if (!isNullorEmpty(partner) && nlapiLookupField('partner', partner,
    'custentity_company_territory') == "T") {
    return true;
  } else return false;
}
