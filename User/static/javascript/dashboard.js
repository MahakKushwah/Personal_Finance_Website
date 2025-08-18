        let transactionData = [];
        let categoryChart = null;
        let trendChart = null;

        // File upload handling
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        const loading = document.getElementById('loading');
        const errorMessage = document.getElementById('errorMessage');
        const showFilesBtn = document.getElementById("showFilesBtn");
        const fileList = document.getElementById("fileList");
        //Date Filter Logic 
        const fromInput = document.getElementById("from");
        const toInput = document.getElementById("to");
        const filterBtn = document.querySelector(".filter-btn");
        const noDataMessage = document.getElementById("noDataMessage");

        // Drag and drop functionality
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            clearDateFilters();
            handleFiles(files);
        });

        // When files are selected, show them in UI
        let selectedFiles = [];

        // Store selected files
        fileInput.addEventListener("change", () => {
            const newFiles = Array.from(fileInput.files);

            // Only add files that are not already in the list (prevent duplicates)
            newFiles.forEach(file => {
                if (!selectedFiles.some(f => f.name === file.name && f.size === file.size)) {
                    selectedFiles.push(file);
                }
            });
        });

        // Toggle file list display on button click
        showFilesBtn.addEventListener("click", () => {
            if (fileList.style.display === "none") {
                fileList.style.display = "block";

                if (selectedFiles.length === 0) {
                    fileList.innerHTML = "<li>No files selected</li>";
                } else {
                    // Render only missing items (don’t clear old ones)
                    const existingNames = Array.from(fileList.querySelectorAll("li")).map(li => li.textContent);

                    selectedFiles.forEach(file => {
                        if (!existingNames.includes(file.name)) {
                            const li = document.createElement("li");
                            li.textContent = file.name;
                            fileList.appendChild(li);
                        }
                    });
                }

                setTimeout(() => {
                    fileList.style.display = "none";
                }, 2000);

            } else {
                fileList.style.display = "none";
            }
        });

        fileInput.addEventListener('change', (e) => {
            clearDateFilters();
            handleFiles(e.target.files);
        });

        // Date Range Filter
        filterBtn.addEventListener("click", () => {
            const fromDate = fromInput.value ? new Date(fromInput.value) : null;
            const toDate = toInput.value ? new Date(toInput.value) : null;
            const today = new Date();  // current date

            let allTransactions = [];
            let filteredTransactions = []
            allTransactions = transactionData;

            const flatTransactions = transactionData.flat();
            let filtered = flatTransactions;

            if (fromDate && toDate) {
                // Case 1: From Date and To Date selected
                filtered = flatTransactions.filter(tx => {
                const txDate = new Date(tx.date);
                return txDate >= fromDate && txDate <= toDate;
                });
            }else if (fromDate && !toDate) {
                // Case 2: From only, use today as end
                filtered = flatTransactions.filter(tx => {
                const txDate = new Date(tx.date);
                return txDate >= fromDate && txDate <= today;
                });
            }else if (!fromDate && toDate) {
                // Case 3: To only, include everything before toDate
                filtered = flatTransactions.filter(tx => {
                const txDate = new Date(tx.date);
                return txDate <= toDate;
                });
            } else {
                // Case 4: No date selected -> show all
                filtered = allTransactions.flat();
            }

            if (filtered.length === 0) {
                noDataMessage.style.display = "block";
                noDataMessage.textContent = `Transactions not found from ${fromInput.value} to ${toInput.value}`;
            } else if (!fromDate && !toDate){
                noDataMessage.style.display = "none";
                analyzeTransactions();
            }else {
                noDataMessage.style.display = "none";
                filteredTransactions = [filtered];  // update data set
                analyzeTransactions(fromDate , toDate , filteredTransactions);
            }
        });

        //To find the bank name 
        function detectBankName(lines) {
            const patterns = [
                { regex: /hdfc/i, name: "HDFC Bank" },
                { regex: /icici/i, name: "ICICI Bank" },
                { regex: /state\s+bank\s+of\s+india|sbi/i, name: "State Bank of India (SBI)" },
                { regex: /bank\s+of\s+india/i, name: "Bank of India" },
                { regex: /axis/i, name: "Axis Bank" },
                { regex: /kotak/i, name: "Kotak Mahindra Bank" },
                { regex: /yes bank/i, name: "Yes Bank" },
                { regex: /punjab/i, name: "Punjab National Bank" },
                { regex: /canara/i, name: "Canara Bank" },
                { regex: /federal/i, name: "Federal Bank" },
            ];

            // Scan only first N lines (header part of statement usually)
            for (let i = 0; i < Math.min(20, lines.length); i++) {
                const l = lines[i];
                for (const p of patterns) {
                    if (p.regex.test(l)) 
                        return p.name;
                }
                // fallback: any line that contains "bank"
                if (/bank/i.test(l)) 
                    return l.trim();
            }
            return null;
        }

        function showError(message) {
            errorMessage.textContent = message;
            setTimeout(() => {
                errorMessage.style.display = 'block';
            }, 5000);
            setTimeout(() => {
                errorMessage.style.display = 'none';
            }, 5000);
        }

        function showLoading(show) {
            loading.style.display = show ? 'block' : 'none';
        }

        async function handleFiles(files) {
            if (files.length === 0) return;

            showLoading(true);
            transactionData = [];

            try {
                for (const file of files) {
                    const ext = file.name.split('.').pop().toLowerCase();
                    let transactions = [];

                    if (ext === 'csv') {
                      const data = await processCSV(file);
                      transactions = transactions.concat(data);
                    } else if (ext === 'xls' || ext === 'xlsx') {
                      const data = await processExcel(file);
                      transactions = transactions.concat(data);
                    } else if (ext === 'pdf') {
                      const data = await processPDF(file);
                      //currentBankName = bankName;
                      transactions = transactions.concat(data);
                    } else {
                        showError('Unsupported file format. Please upload PDF, Excel, or CSV files : ${file.name}');
                        continue;
                    }
                    transactionData.push(transactions);
                }

                if (transactionData.length > 0) {
                    sendToBackend(transactionData); 
                    analyzeTransactions(fromDate = null , toDate = null , filteredTransactions = []);
                    showAnalytics(); 
                } else {
                    showError('No transaction data found in the uploaded files.');
                }
            } catch (error) {
                showError('Error processing files: ' + error.message);
            } finally {
                showLoading(false);
            }
        }

        //let currentBankName = "";
        async function processPDF(file) {

            async function loadPDF(password = null) {
                const arrayBuffer = await file.arrayBuffer();
                const data = new Uint8Array(arrayBuffer);
                const pdf = await pdfjsLib.getDocument({ data, password }).promise;
                console.log("PDF loaded successfully", pdf.numPages);

                let allLines = [];

                for (let p = 1; p <= pdf.numPages; p++) {
                    const page = await pdf.getPage(p);
                    const content = await page.getTextContent();

                    const byY = {};
                    content.items.forEach((it) => {
                        const y = Math.round(it.transform[5]);
                        const x = it.transform[4];
                        if (!byY[y]) byY[y] = [];
                        byY[y].push({ x, str: it.str });
                    });

                    const pageLines = Object.keys(byY)
                    .map(Number)
                    .sort((a, b) => b - a)
                    .map((y) =>
                        byY[y]
                        .sort((a, b) => a.x - b.x)
                        .map((t) => t.str)
                        .join(" ")
                        .replace(/\s{2,}/g, " ")
                        .trim()
                    );
                    allLines = allLines.concat(pageLines);
                }
                return parseTransactionText(allLines).transactions;
            }
            let transactions;
            try {
                transactions = await loadPDF();
            } catch (err) {
                if (err.name === "PasswordException") {
                    if (err.code === pdfjsLib.PasswordResponses.NEED_PASSWORD ||err.code === pdfjsLib.PasswordResponses.INCORRECT_PASSWORD) {
                        const userPassword = prompt("This PDF is password protected. Enter password:");
                        if (userPassword) {
                            transactions = await loadPDF(userPassword);
                        } else {
                            throw new Error("Password required but not provided.");    
                        }                      
                    }
                }else{
                        throw err;
                }
                
            }
            return transactions;
        }
        
        async function processExcel(file) {
            const arrayBuffer = await file.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }); // Raw array of rows

            if (data.length < 2) return [];

            const headers = data[0].map(h => h ? h.toString().toLowerCase().trim() : '');

            let dateCol = -1, descCol = -1, withdrawalCol = -1, depositCol = -1;

             headers.forEach((header, index) => {
                if (header.includes("value date") || header.includes("transaction date")) dateCol = index;
                if (header.includes("description") || header.includes("remarks") || header.includes("narration")) descCol = index;
                if (header.includes("withdrawal") || header.includes("debit")) withdrawalCol = index;
                if (header.includes("deposit") || header.includes("credit")) depositCol = index;
            });

            if (dateCol === -1) dateCol = 1;
            if (descCol === -1) descCol = 4;
            if (withdrawalCol === -1) withdrawalCol = 5;
            if (depositCol === -1) depositCol = 6;

            const transactions = [];

            for (let i = 1; i < data.length; i++) {
                const row = data[i];
                if (!row || row.length === 0) continue;

                const parsedDate = parseDate(row[dateCol] || row["Date"] || row["date"] || row["Txn Date"] || "");
				let formattedDate = null;
                if (parsedDate instanceof Date && !isNaN(parsedDate)) {
                    // Add one day before formatting
                    parsedDate.setDate(parsedDate.getDate() + 1);
                    formattedDate = parsedDate?.toISOString().split('T')[0];
                }
                const description = (row[descCol] || row["Description"] || row["Transaction Remarks"] || row["Remarks"] ||"").toString().trim();
                const withdrawalAmount = parseFloat((row[withdrawalCol] || row["Withdrawal Amount"] || row["Debit Amount"] || row["Debit"] || '0').replace(/[₹,]/g, ''));
                const depositAmount = parseFloat((row[depositCol] || row["Deposit Amount"] || row["Credit Amount"] || row["Credit"] ||'0').replace(/[₹,]/g, ''));
				const totalamount = parseFloat((row["Balance"] || '0').replace(/[₹,]/g, ''));

                //To identify whether the transaction type is credit or debit 
                let type = null;
                if (/CR/i.test(description))
                    type = "credit";
                else if (/DR/i.test(description)) 
                    type = "debit";
                else type = "debit";

                if (parsed.length === 0 && type) {
                    parsed.push({
                        date: formattedDate,
                        description,
                        withdrawal: withdrawalAmount,
                        deposit: depositAmount,
                        type,
                        category: categorizeTransaction(description, type),
                        balance: totalamount,
                    });
                }
            }
            return transactions;
        }

        async function processCSV(file) {
            return new Promise(resolve => {
                Papa.parse(file, {
                    header: true,
                    skipEmptyLines: true,
                    complete: results => {
                        const transactions = results.data.map(row => {
                            const rawDate = row["Date"] || row["date"] || row["Txn Date"] || "";
                            const parsedDate = parseDate(rawDate);
                            let formattedDate = null;
                             if (parsedDate instanceof Date && !isNaN(parsedDate)) {
                                // Add one day before formatting
                                parsedDate.setDate(parsedDate.getDate() + 1);
                                formattedDate = parsedDate?.toISOString().split('T')[0];
                            }
                            const description = row["Description"] || row["Transaction Remarks"] || row["Remarks"] || '';
                            const withdrawal = parseFloat((row["Withdrawal Amount"] || row["Debit Amount"] || row["Debit"] || '0').replace(/[₹,]/g, ''));
                            const deposit = parseFloat((row["Deposit Amount"] || row["Credit Amount"] || row["Credit"] || '0').replace(/[₹,]/g, ''));
                            const totalamount = parseFloat((row["Balance"] || '0').replace(/[₹,]/g, ''));
                            const parsed = [];
                            
                            //To identify whether the transaction type is credit or debit 
                             let type = null;
                            if (/CR/i.test(description))
                                 type = "credit";
                            else if (/DR/i.test(description)) 
                                type = "debit";
                            else type = "debit";

                            if (parsed.length === 0 && type) {
                                parsed.push({
                                    date: formattedDate,
                                    description,
                                    withdrawal: withdrawal,
                                    deposit: deposit,
                                    type,
                                    category: categorizeTransaction(description, type),
                                    balance: totalamount,
                                });
                            }

                    return parsed;
                }).flat();
                resolve(transactions);
            }
            });
        });
        }

        //Send data to Backend
        async function sendToBackend(data) {
        //  Log the data we’re about to send
        console.log("Sending to backend:", data);
        status.textContent = 'Uploading...';

        // Force the correct absolute URL
        const uploadUrl = 'api/upload-transactions/';
        console.log("Target URL:", uploadUrl);

        try {
            const response = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken(),
            },
            // Ensure data is a flat array before sending
            body: JSON.stringify({ transactions: Array.isArray(data) ? data.flat() : [] })
        });

        // Read the raw text first (for debugging if it's not valid JSON)
        const rawText = await response.text();

        // Try to parse JSON if possible
        let result;
        try {
            console.log("Raw Text : " + rawText);
            result = JSON.parse(rawText);
           console.log("Payload:", JSON.stringify({ transactions: Array.isArray(data) ? data.flat() : [] }));
        } catch (err) {
            console.log("Payload:", JSON.stringify({ transactions: Array.isArray(data) ? data.flat() : [] }));
            console.warn("Response is not JSON:", err);
            result = { error: rawText };
        }

        //  Log final result
        console.log("Parsed response:", result);
        status.textContent = result.message || result.error || 'Done';
        } catch (err) {
            console.error("Upload failed:", err);
            status.textContent = 'Upload failed.';
            }
        }

        function getCSRFToken() {
          return document.querySelector('meta[name="csrf-token"]').getAttribute('content');
        }

        function parseTransactionText(lines) {
            // detect Bank Name
            //let bankName = detectBankName(lines);

            const row = /^\d+\s+(\d{2}[-/]\d{2}[-/]\d{4})\s+(.+?)\s+([\d,]+\.\d{2})$/;
            const balanceRow = /^(?:Balance\s+)?₹?\s*([\d,]+\.\d{2})$/i;;

            const clean = (s) =>s == null || s === "" ? null : parseFloat(String(s).replace(/[₹,\s]/g, ""));
            const toISO = (ddmmyyyy) => {
                const [dd, mm, yyyy] = ddmmyyyy.replace(/\//g, "-").split("-");
                const d = new Date(Date.UTC(+yyyy, +mm - 1, +dd));
                return isNaN(d) ? null : d.toISOString().slice(0, 10);
            };

            const transactions = [];
            let lastTx = null;

            for (const line of lines) {
                let m = row.exec(line);
                if (m) {
                    const [, dateStr, desc, amountStr] = m;
                    const amount = clean(amountStr);

                    let type = null;
                    if (/CR/i.test(desc)) type = "credit";
                    else if (/DR/i.test(desc)) type = "debit";
                    else type = "debit"; // fallback

                    lastTx = {
                        date: toISO(dateStr),
                        description: desc,
                        withdrawal: type === "debit" ? amount : 0,
                        deposit: type === "credit" ? amount : 0,
                        type,
                        category: categorizeTransaction(desc, type),
                        balance: undefined
                    };

                    transactions.push(lastTx);
                    continue;
                }

                // If this line is just a Balance
                let b = balanceRow.exec(line);
                if (b && lastTx) {
                    lastTx.balance = clean(b[1]);
                }
            }
            return transactions;
        }

        function parseDate(dateStr) {
            //  Prevent error if input is null/undefined/empty
            if (!dateStr) return new Date();

            const cleanDate = dateStr.toString().replace(/[^\d\/\-]/g, '');

            const formats = [
                /(\d{2})\/(\d{2})\/(\d{4})/,
                /(\d{2})-(\d{2})-(\d{4})/,
                 /(\d{2})\/(\d{2})\/(\d{2})/,
                 /(\d{2})-(\d{2})-(\d{2})/
             ];

            for (let format of formats) {
                const match = cleanDate.match(format);
                if (match) {
                    let [, day, month, year] = match;
                    if (year.length === 2) {
                        year = '20' + year;
                    }
            return new Date(year, month - 1, day);
            }
        }
        // If no match found, return current date
            return new Date();
        }

        function categorizeTransaction(description, transactionType = 'debit') {
            const desc = description.toLowerCase();
            
            // If it's a credit transaction, check for income patterns first
            if (transactionType === 'credit') {
                if (desc.includes('salary') || desc.includes('sal cr') || desc.includes('payroll') ||
                    desc.includes('interest') || desc.includes('int cr') || desc.includes('dividend') ||
                    desc.includes('refund') || desc.includes('cashback') || desc.includes('bonus') ||
                    desc.includes('fd maturity') || desc.includes('rd maturity')) {
                    return 'Income';
                }
                return 'Income'; // Default credits to income
            }
            
            // For debit transactions, categorize based on description patterns
            
            // Investment keywords - Enhanced for your data
            if (desc.includes('mf-') || desc.includes('mutual fund') || desc.includes('sip') ||
                desc.includes('mirae') || desc.includes('dsp mutu') || desc.includes('axis mutu') ||
                desc.includes('hdfc mutu') || desc.includes('icici pru') || desc.includes('sbi mutu') ||
                desc.includes('kotak mutu') || desc.includes('franklin') || desc.includes('birla sun') ||
                desc.includes('zerodha') || desc.includes('groww') || desc.includes('upstox') ||
                desc.includes('equity') || desc.includes('investment') || desc.includes('stocks') ||
                desc.includes('eba/mf') || desc.includes('systematic') || desc.includes('nav')) {
                return 'Investment';
            }
            
            // UPI and Digital Payments
            if (desc.includes('upi/') || desc.includes('paytm') || desc.includes('phonepe') ||
                desc.includes('googlepay') || desc.includes('amazon pay') || desc.includes('mobikwik') ||
                desc.includes('freecharge') || desc.includes('bhim') || desc.includes('whatsapp')) {
                return 'Expense';
            }
            
            // Food & Dining
            if (desc.includes('swiggy') || desc.includes('zomato') || desc.includes('dominos') ||
                desc.includes('mcdonald') || desc.includes('kfc') || desc.includes('pizza') ||
                desc.includes('restaurant') || desc.includes('hotel') || desc.includes('cafe') ||
                desc.includes('food') || desc.includes('dining')) {
                return 'Expense';
            }
            
            // Shopping & E-commerce
            if (desc.includes('amazon') || desc.includes('flipkart') || desc.includes('myntra') ||
                desc.includes('ajio') || desc.includes('nykaa') || desc.includes('bigbasket') ||
                desc.includes('grofers') || desc.includes('dunzo') || desc.includes('shopping') ||
                desc.includes('purchase') || desc.includes('pos ')) {
                return 'Expense';
            }
            
            // Transportation
            if (desc.includes('uber') || desc.includes('ola') || desc.includes('rapido') ||
                desc.includes('fuel') || desc.includes('petrol') || desc.includes('diesel') ||
                desc.includes('metro') || desc.includes('bus') || desc.includes('taxi') ||
                desc.includes('parking') || desc.includes('toll')) {
                return 'Expense';
            }
            
            // Utilities & Bills
            if (desc.includes('electricity') || desc.includes('water') || desc.includes('gas') ||
                desc.includes('internet') || desc.includes('broadband') || desc.includes('mobile') ||
                desc.includes('recharge') || desc.includes('postpaid') || desc.includes('prepaid') ||
                desc.includes('dth') || desc.includes('cable') || desc.includes('utility')) {
                return 'Expense';
            }
            
            // EMI & Loans
            if (desc.includes('emi') || desc.includes('loan') || desc.includes('home loan') ||
                desc.includes('car loan') || desc.includes('personal loan') || desc.includes('credit card') ||
                desc.includes('bajaj finserv') || desc.includes('hdfc bank') || desc.includes('icici bank')) {
                return 'Expense';
            }
            
            // Healthcare
            if (desc.includes('medical') || desc.includes('hospital') || desc.includes('pharmacy') ||
                desc.includes('doctor') || desc.includes('clinic') || desc.includes('medicine') ||
                desc.includes('apollo') || desc.includes('max healthcare')) {
                return 'Expense';
            }
            
            // ATM & Cash Withdrawals
            if (desc.includes('atm') || desc.includes('cash withdrawal') || desc.includes('cash wdl') ||
                desc.includes('pos cash')) {
                return 'Expense';
            }
            
            // Bank Charges & Fees
            if (desc.includes('charges') || desc.includes('fee') || desc.includes('service charge') ||
                desc.includes('annual fee') || desc.includes('sms charges') || desc.includes('minimum balance')) {
                return 'Other';
            }
            
            // Transfers
            if (desc.includes('transfer') || desc.includes('neft') || desc.includes('rtgs') ||
                desc.includes('imps') || desc.includes('fund transfer')) {
                return 'Other';
            }
            
            return 'Other';
        }

        function analyzeTransactions(fromDate , toDate , filteredTransactions) {
            const categories = { 'Expense': 0, 'Investment': 0, 'Income': 0, 'Other': 0 };
            
            let flatTransactions = [];
            // Flattens nested arrays
            if(fromDate && toDate || fromDate && !toDate || !fromDate && toDate){
                flatTransactions = filteredTransactions.flat();
            }else{
                flatTransactions = transactionData.flat();
            } 

            flatTransactions.forEach(transaction => {
                categories[transaction.category] += (transaction.deposit || 0) + (transaction.withdrawal || 0);
            });

            // Update stats
            document.getElementById('totalExpenses').textContent = '₹' + categories.Expense.toLocaleString();
            document.getElementById('totalInvestments').textContent = '₹' + categories.Investment.toLocaleString();
            document.getElementById('totalIncome').textContent = '₹' + categories.Income.toLocaleString();
            document.getElementById('totalOthers').textContent = '₹' + categories.Other.toLocaleString();

            // Create charts
            createCategoryChart(categories);
            createTrendChart(fromDate , toDate , filteredTransactions);
            populateTransactionTable(fromDate , toDate , filteredTransactions);
            
            // Log summary for debugging
            console.log('Transaction Summary:', categories);
            console.log('Total transactions processed:', transactionData.length);
        }

        function createCategoryChart(categories) {
            const ctx = document.getElementById('categoryChart').getContext('2d');
            
            if (categoryChart) {
                categoryChart.destroy();
            }

            categoryChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(categories),
                    datasets: [{
                        data: Object.values(categories),
                        backgroundColor: [
                            '#dc3545',
                            '#28a745',
                            '#007bff',
                            '#fd7e14'
                        ],
                        borderWidth: 2,
                        borderColor: '#fff'
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                padding: 20,
                                usePointStyle: true
                            }
                        }
                    }
                }
            });
        }

        function createTrendChart(fromDate , toDate , filteredTransactions) {
            const monthlyData = {};
            
            let flatTransactions = [];
            if(fromDate && toDate || fromDate && !toDate || !fromDate && toDate){
                flatTransactions = filteredTransactions.flat();
            }else{
                flatTransactions = transactionData.flat();
            }

            flatTransactions.forEach(transaction => {
                const monthKey = new Date(transaction.date).toISOString().substring(0, 7);
                if (!monthlyData[monthKey]) {
                    monthlyData[monthKey] = { 'Expense': 0, 'Investment': 0, 'Income': 0, 'Other': 0 };
                }
                monthlyData[monthKey][transaction.category] += (transaction.deposit || 0) + (transaction.withdrawal || 0);
            });

            const sortedMonths = Object.keys(monthlyData).sort();
            
            const ctx = document.getElementById('trendChart').getContext('2d');
            
            if (trendChart) {
                trendChart.destroy();
            }

            trendChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: sortedMonths.map(month => {
                        const date = new Date(month + '-01');
                        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                    }),
                    datasets: [{
                        label: 'Expenses',
                        data: sortedMonths.map(month => monthlyData[month].Expense),
                        borderColor: '#dc3545',
                        backgroundColor: 'rgba(220, 53, 69, 0.1)',
                        tension: 0.4
                    }, {
                        label: 'Investments',
                        data: sortedMonths.map(month => monthlyData[month].Investment),
                        borderColor: '#28a745',
                        backgroundColor: 'rgba(40, 167, 69, 0.1)',
                        tension: 0.4
                    }, {
                        label: 'Income',
                        data: sortedMonths.map(month => monthlyData[month].Income),
                        borderColor: '#007bff',
                        backgroundColor: 'rgba(0, 123, 255, 0.1)',
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return '₹' + value.toLocaleString();
                                }
                            }
                        }
                    }
                }
            });
        }

        function populateTransactionTable(fromDate , toDate , filteredTransactions) {
            const tbody = document.getElementById('transactionBody');
            tbody.innerHTML = '';
            let flatTransactions = [];
            // Flatten in case transactionData is nested
            if(fromDate && toDate || fromDate && !toDate || !fromDate && toDate){
                flatTransactions = filteredTransactions.flat();
            }else{
                flatTransactions = transactionData.flat();
            }

            // Show latest 20 transactions
            const recentTransactions = flatTransactions
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, 20);

            recentTransactions.forEach(transaction => {
            const row = tbody.insertRow();
            const typeClass = transaction.type === 'credit' ? 'amount-positive' : 'amount-negative';
            const typeSymbol = transaction.type === 'credit' ? '+' : '-';

            // Calculate amount
            const amount = (transaction.withdrawal || 0) + (transaction.deposit || 0);

            row.innerHTML = `
                <td>${new Date(transaction.date).toLocaleDateString()}</td>
                <td title="${transaction.description}">
                    ${transaction.description.length > 50 
                    ? transaction.description.substring(0, 50) + '...' 
                    : transaction.description}
                </td>
                <td><span class="category-badge">${transaction.category}</span></td>
                <td class="${typeClass}">${typeSymbol}₹${amount.toLocaleString()}</td>
                <td>₹${(transaction.balance || 0).toLocaleString()}</td>
        `       ;
            });
        }

        function showAnalytics() {
            analyticsSection.style.display = 'block';
            analyticsSection.scrollIntoView({ behavior: 'smooth' });
        }

          //Auto hide the Success Message 
        setTimeout(function () {
            const alertBox = document.getElementById('success-message');
            if (alertBox) {
                alertBox.style.transition = 'opacity 0.5s ease';
                alertBox.style.opacity = '0';
                setTimeout(() => alertBox.style.display = 'none', 500);
            }
        }, 1000);

        //To clear the Date Filter when adding new file
        function clearDateFilters() {
            fromInput.value = "";
            toInput.value = "";
        }

        // async function deleteAllTransactions() {
        //     const confirmDelete = confirm("Are you sure you want to delete all transactions?");
        //     if (!confirmDelete) return;

        //     const response = await fetch("/transactions/delete_all/", {
        //         method: "POST",
        //         headers: {
        //         "X-CSRFToken": getCSRFToken(),  // make sure you include CSRF
        //         },
        //     });

        //     const result = await response.json();
        //     alert(result.message);
        //     location.reload();  // reload page after deletion
        // }