var SS_ID = "12ttc6UMBI6VM8gsEweDdqOrQg_AGo_MH7JNkQqev_OI";
var SHEETS = {
  Transactions: {
    gid: 469090716,
    headers: ["RowID", "Date", "Type", "Category", "Amount", "Description", "Account"]
  },
  Accounts: {
    headers: ["ID", "Type", "Name", "Balance", "Limit", "BankName", "BankType", "AccountNumber"]
  },
  Loans: {
    headers: ["ID", "Name", "Type", "Amount", "Balance", "Rate", "Monthly", "Start", "Notes"]
  },
  Salaries: {
    headers: ["Month", "Basic", "OT", "Travel", "Earnings", "Deductions", "Nett", "EPF", "SOCSO", "EIS", "Tax", "PTPTN", "Motobike", "Surau", "Club", "EmpEPF"]
  },
  Recurring: {
    headers: ["ID", "Name", "Category", "Amount", "Day", "Status"]
  },
  Budgets: {
    headers: ["Category", "Amount"]
  },
  RecurringPayments: {
    headers: ["Month", "ItemID", "AmountPaid", "PaidDate", "Account", "Note"]
  }
};

function getSpreadsheet_() {
  return SpreadsheetApp.openById(SS_ID);
}

function getSheet_(name) {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

function setupDatabase() {
  var ss = getSpreadsheet_();
  var names = Object.keys(SHEETS);

  for (var i = 0; i < names.length; i++) {
    var name = names[i];
    var config = SHEETS[name];
    var sheet = getSheet_(name);
    var lastCol = sheet.getLastColumn();
    var needsHeaders = false;

    if (lastCol === 0) {
      needsHeaders = true;
    } else {
      var existingHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
      needsHeaders = !existingHeaders[0];
    }

    if (needsHeaders) {
      sheet.getRange(1, 1, 1, config.headers.length).setValues([config.headers]);
      sheet.getRange(1, 1, 1, config.headers.length).setFontWeight("bold");
      sheet.setFrozenRows(1);
    }
  }

  var defaultSheet = ss.getSheetByName("Sheet1");
  if (defaultSheet && ss.getSheets().length > 1) {
    try { ss.deleteSheet(defaultSheet); } catch (e) {}
  }

  var gidConfig = SHEETS.Transactions;
  if (gidConfig.gid) {
    var txSheet = ss.getSheetByName("Transactions");
    if (txSheet && txSheet.getSheetId() !== gidConfig.gid) {
      Logger.log("Note: Transactions sheet GID is " + txSheet.getSheetId() + ", expected " + gidConfig.gid);
    }
  }

  Logger.log("Database setup complete. Sheets created: " + names.join(", "));
  return "Setup complete! Sheets: " + names.join(", ");
}

// ============================================================
// GET Handler
// ============================================================
function doGet(e) {
  var action = e.parameter.action;
  var sheet = e.parameter.sheet || "Transactions";
  var result;

  try {
    if (action === "getAll") {
      result = getAllTransactions_();
    } else if (action === "getAccounts") {
      result = getAll_("Accounts");
    } else if (action === "getLoans") {
      result = getAll_("Loans");
    } else if (action === "getSalaries") {
      result = getAll_("Salaries");
    } else if (action === "getRecurring") {
      result = getAll_("Recurring");
    } else if (action === "getBudgets") {
      result = getAll_("Budgets");
    } else if (action === "getRecurringPayments") {
      result = getAll_("RecurringPayments");
    } else if (action === "getSheet") {
      result = getAll_(sheet);
    } else {
      result = getAllTransactions_();
    }
  } catch (err) {
    result = { success: false, error: err.message };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// POST Handler
// ============================================================
function doPost(e) {
  var payload = JSON.parse(e.postData.contents);
  var action = payload.action;
  var result;

  try {
    switch (action) {
      case "add":
        result = addTransaction_(payload);
        break;
      case "update":
        result = updateTransaction_(payload);
        break;
      case "delete":
        result = deleteTransaction_(payload);
        break;
      case "addRow":
        result = addRow_(payload.sheet, payload.data);
        break;
      case "updateRow":
        result = updateRow_(payload.sheet, payload.data);
        break;
      case "deleteRow":
        result = deleteRow_(payload.sheet, payload.data);
        break;
      default:
        result = { success: false, error: "Unknown action: " + action };
    }
  } catch (err) {
    result = { success: false, error: err.message };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// Transactions
// ============================================================
function getAllTransactions_() {
  var sheet = getSheet_("Transactions");
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var rows = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[0]) continue;
    rows.push({
      rowId: row[0],
      date: row[1],
      type: row[2],
      category: row[3],
      amount: row[4],
      description: row[5],
      account: row[6] || "cash"
    });
  }

  return { success: true, rows: rows };
}

function addTransaction_(payload) {
  var sheet = getSheet_("Transactions");
  var lastRow = sheet.getLastRow();
  var newRowId = lastRow > 0 ? lastRow : 1;

  sheet.appendRow([
    newRowId,
    payload.date,
    payload.type,
    payload.category,
    payload.amount,
    payload.description || "",
    payload.account || "cash"
  ]);

  return { success: true, rowId: newRowId };
}

function updateTransaction_(payload) {
  var sheet = getSheet_("Transactions");
  var data = sheet.getDataRange().getValues();
  var rowId = payload.rowId;

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == rowId) {
      var rowNum = i + 1;
      sheet.getRange(rowNum, 1, 1, 7).setValues([[
        rowId,
        payload.date,
        payload.type,
        payload.category,
        payload.amount,
        payload.description || "",
        payload.account || "cash"
      ]]);
      return { success: true };
    }
  }

  return { success: false, error: "RowID not found: " + rowId };
}

function deleteTransaction_(payload) {
  var sheet = getSheet_("Transactions");
  var data = sheet.getDataRange().getValues();
  var rowId = payload.rowId;

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == rowId) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }

  return { success: false, error: "RowID not found: " + rowId };
}

// ============================================================
// Generic Sheet Operations
// ============================================================
function getAll_(sheetName) {
  var sheet = getSheet_(sheetName);
  var data = sheet.getDataRange().getValues();
  if (data.length < 1) return { success: true, rows: [] };

  var headers = data[0];
  var rows = [];

  for (var i = 1; i < data.length; i++) {
    var row = {};
    for (var j = 0; j < headers.length; j++) {
      row[headers[j]] = data[i][j];
    }
    rows.push(row);
  }

  return { success: true, rows: rows };
}

function addRow_(sheetName, rowData) {
  var sheet = getSheet_(sheetName);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var row = [];

  for (var i = 0; i < headers.length; i++) {
    var val = rowData[headers[i]];
    row.push(val !== undefined ? val : "");
  }

  sheet.appendRow(row);
  return { success: true };
}

function updateRow_(sheetName, rowData) {
  var sheet = getSheet_(sheetName);
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idCol = 0;
  var idVal = rowData[headers[0]];

  for (var i = 1; i < data.length; i++) {
    if (data[i][idCol] == idVal) {
      var row = [];
      for (var j = 0; j < headers.length; j++) {
        var val = rowData[headers[j]];
        row.push(val !== undefined ? val : data[i][j]);
      }
      sheet.getRange(i + 1, 1, 1, headers.length).setValues([row]);
      return { success: true };
    }
  }

  return { success: false, error: "Row not found" };
}

function deleteRow_(sheetName, rowData) {
  var sheet = getSheet_(sheetName);
  var data = sheet.getDataRange().getValues();
  var idCol = 0;
  var idVal = rowData[Object.keys(rowData)[0]];

  for (var i = 1; i < data.length; i++) {
    if (data[i][idCol] == idVal) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }

  return { success: false, error: "Row not found" };
}
