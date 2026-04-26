// Detect API URL
const getApiUrl = () => {
    // If we are on localhost, use relative path regardless of port
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return '/api';
    }
    // Fallback for other environments
    return '/api';
};

const API_URL = getApiUrl();

// DOM Elements
const loginForm = document.getElementById('login-form');
const navLinks = document.querySelectorAll('.nav-links a');
const sections = document.querySelectorAll('.content-section');
const houseModal = document.getElementById('house-modal');
const addHouseBtn = document.getElementById('add-house-btn');
const closeBtn = document.querySelector('.close');
const houseForm = document.getElementById('house-form');
const paymentForm = document.getElementById('payment-form');
const houseSearch = document.getElementById('house-search');

// State
let houses = [];
let payments = [];
let expenses = [];
let collections = [];
let currentReportData = null;
let currentUser = null;

document.addEventListener('click', (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;
    const action = target.dataset.action;
    const id = target.dataset.id;
    if (action === 'show-section') {
        const section = target.dataset.target;
        if (section) {
            showSection(section);
        }
    } else if (action === 'edit-house' && id) {
        window.editHouse(id);
    } else if (action === 'delete-house' && id) {
        window.deleteHouse(id);
    } else if (action === 'generate-receipt' && id) {
        window.generateReceipt(id);
    } else if (action === 'delete-payment' && id) {
        window.deletePayment(id);
    } else if (action === 'generate-voucher' && id) {
        window.generateVoucherPDF(id);
    } else if (action === 'delete-expense' && id) {
        window.deleteExpense(id);
    } else if (action === 'download-all-vouchers') {
        window.downloadAllVouchers();
    } else if (action === 'download-report') {
        window.loadReport();
    } else if (action === 'download-report-list') {
        const type = target.dataset.type;
        if (type) {
            window.downloadReportList(type);
        }
    } else if (action === 'toast-close') {
        const toast = target.closest('.notification-toast');
        if (toast && toast.parentElement) {
            toast.remove();
        }
    } else if (action === 'generate-coll-receipt' && id) {
        window.generateCollectionReceipt(id);
    } else if (action === 'delete-collection' && id) {
        window.deleteCollection(id);
    } else if (action === 'download-recon-report') {
        window.downloadReconReport();
    } else if (action === 'delete-user' && id) {
        window.deleteUser(id);
    }
});

// --- UI Helpers ---

function showNotification(type, title, message) {
    const container = document.getElementById('notification-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `notification-toast ${type}`;
    
    let icon = 'info-circle';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'exclamation-circle';
    if (type === 'warning') icon = 'exclamation-triangle';

    toast.innerHTML = `
        <div class="toast-icon"><i class="fas fa-${icon}"></i></div>
        <div class="toast-content">
            <div class="toast-title"></div>
            <div class="toast-message"></div>
        </div>
        <div class="toast-close" data-action="toast-close"><i class="fas fa-times"></i></div>
    `;
    
    // Set text content safely to prevent XSS
    toast.querySelector('.toast-title').textContent = title;
    toast.querySelector('.toast-message').textContent = message;

    container.appendChild(toast);

    // Auto remove after 5 seconds
    setTimeout(() => {
        toast.style.animation = 'slideInRight 0.3s ease-out reverse forwards';
        setTimeout(() => {
            if (toast.parentElement) toast.remove();
        }, 300);
    }, 5000);
}

function showConfirmModal(title, message, onConfirm) {
    const modal = document.getElementById('confirm-modal');
    if (!modal) return;
    
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-message').textContent = message;
    
    const okBtn = document.getElementById('confirm-ok-btn');
    const cancelBtn = document.getElementById('confirm-cancel-btn');
    
    // Clone to remove old listeners
    const newOk = okBtn.cloneNode(true);
    const newCancel = cancelBtn.cloneNode(true);
    
    okBtn.parentNode.replaceChild(newOk, okBtn);
    cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);
    
    newOk.addEventListener('click', () => {
        modal.style.display = 'none';
        if (onConfirm) onConfirm();
    });
    
    newCancel.addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    modal.style.display = 'block';
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
});

// Handle Back/Forward Cache
window.onpageshow = function(event) {
  if (event.persisted) {
    checkAuth();
  }
};

function checkAuth() {
  const token = localStorage.getItem('token');
  
  // Check if we are on login page or dashboard
  if (loginForm) {
    if (token) {
      window.location.replace('dashboard.html');
    }
    setupLogin();
  } else {
    if (!token) {
      window.location.replace('index.html');
    } else {
      verifyToken();
      setupDashboard();
    }
  }
}

async function verifyToken() {
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/auth/verify`, {
            headers: { 'x-auth-token': token }
        });
        
        if (!res.ok) {
            throw new Error('Invalid token');
        }

        currentUser = await res.json();
        // Update UI with user info if needed
        const welcomeMsg = document.querySelector('.user-info span');
        if (welcomeMsg && currentUser) {
            welcomeMsg.textContent = `Welcome, ${currentUser.username} (${currentUser.role || 'User'})`;
        }
    } catch (err) {
        console.error('Auth verification failed', err);
        logout();
    }
}

function setupLogin() {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = e.target.username.value;
    const password = e.target.password.value;
    const errorMsg = document.getElementById('error-msg');

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        localStorage.setItem('token', data.token);
        window.location.replace('dashboard.html');
      } else {
        errorMsg.textContent = data.msg;
      }
    } catch (err) {
      errorMsg.textContent = 'Server connection error';
    }
  });
}

function setupDashboard() {
  // Navigation
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = link.dataset.target;
      
      if (link.id === 'logout') {
        logout();
        return;
      }

      showSection(target);
    });
  });

  // Initial Load
    const savedSection = localStorage.getItem('currentSection');
    if (savedSection) {
        showSection(savedSection);
    }
    
    fetchHouses();
    fetchPayments();
    populateYearDropdowns();
    setupHistoryFilters();
    setupHouseFilters();
    setupExpenseFilters();

    // House Modal
  if (addHouseBtn) {
    addHouseBtn.addEventListener('click', () => {
        document.getElementById('modal-title').textContent = 'Add New House';
        houseForm.reset();
        document.getElementById('house-id').value = '';
        houseModal.style.display = 'block';
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
        houseModal.style.display = 'none';
    });
  }

  // Ledger Modal
  const ledgerModal = document.getElementById('ledger-modal');
  const closeLedgerBtn = document.querySelector('.close-ledger');
  if (closeLedgerBtn) {
      closeLedgerBtn.addEventListener('click', () => {
          ledgerModal.style.display = 'none';
      });
  }

  // Ledger Tab Switching
  const ledgerTabBtns = document.querySelectorAll('.ledger-tab-btn');
  ledgerTabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
          const target = btn.dataset.tab;
          
          // Update buttons
          ledgerTabBtns.forEach(b => {
              b.classList.remove('active');
              b.style.borderBottomColor = 'transparent';
          });
          btn.classList.add('active');
          btn.style.borderBottomColor = 'var(--primary-color)';

          // Update content
          document.querySelectorAll('.ledger-tab-content').forEach(content => {
              content.style.display = 'none';
          });
          const contentEl = document.getElementById(target);
          if (contentEl) contentEl.style.display = 'block';
      });
  });

  // Global Click Handlers (Delegation)
  document.addEventListener('click', (e) => {
      const target = e.target.closest('button');
      if (!target || !target.dataset.action) return;

      const action = target.dataset.action;
      const id = target.dataset.id;

      if (action === 'view-ledger') {
          openHouseLedger(id);
      } else if (action === 'edit-house') {
          editHouse(id);
      } else if (action === 'delete-house') {
          deleteHouse(id);
      } else if (action === 'delete-collection') {
          deleteCollection(id);
      } else if (action === 'delete-payment') {
          deletePayment(id);
      } else if (action === 'generate-receipt') {
          generateReceipt(id);
      } else if (action === 'print-collection-receipt') {
          printCollectionReceipt(id);
      } else if (action === 'download-report') {
          loadReport();
      } else if (action === 'download-report-list') {
          downloadReportList(target.dataset.type);
      } else if (action === 'download-recon-report') {
          downloadReconReport();
      } else if (action === 'print-voucher') {
          generateVoucherPDF(expenses.find(ex => ex._id === id), true);
      } else if (action === 'print-all-vouchers') {
          generateVoucherPDF(expenses, false);
      }
  });

  window.onclick = (e) => {
      if (e.target == houseModal) {
          houseModal.style.display = 'none';
      }
      if (e.target == ledgerModal) {
          ledgerModal.style.display = 'none';
      }
      const confirmModal = document.getElementById('confirm-modal');
      if (confirmModal && e.target == confirmModal) {
          confirmModal.style.display = 'none';
      }
  }

  // House Form Submit
  if (houseForm) {
      houseForm.addEventListener('submit', handleHouseSubmit);
  }

  // Payment Form Submit
  if (paymentForm) {
      paymentForm.addEventListener('submit', handlePaymentSubmit);
  }

  // Search
  if (houseSearch) {
      houseSearch.addEventListener('input', (e) => {
          renderHouses(e.target.value);
      });
  }

  // Payment Mode Change
  const paymentMode = document.getElementById('payment-mode');
  if (paymentMode) {
      paymentMode.addEventListener('change', (e) => {
          const refGroup = document.getElementById('transaction-ref-group');
          if (e.target.value === 'Bank') {
              refGroup.style.display = 'block';
          } else {
              refGroup.style.display = 'none';
          }
      });
  }

  setupPaymentFormListeners();
  setupExpenseListeners();
  setupCollectionListeners();
  setupProfileListeners();
}

function showSection(sectionId) {
    // Save state
    localStorage.setItem('currentSection', sectionId);

    // Update Nav Links
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.dataset.target === sectionId) {
            link.classList.add('active');
        }
    });

    // Update Sections
    sections.forEach(section => {
        section.classList.remove('active');
        if (section.id === sectionId) {
            section.classList.add('active');
        }
    });

    if (sectionId === 'reports') {
        loadReport(); // Auto load report when tab is clicked
    }
    if (sectionId === 'expenses') {
        fetchExpenses();
    }
    if (sectionId === 'collections') {
        fetchCollections();
    }
    if (sectionId === 'profile') {
        loadProfile();
    }
}

function loadProfile() {
    // Check if user is admin
    const userManagementCard = document.getElementById('user-management-card');
    if (currentUser && currentUser.role === 'admin') {
        userManagementCard.style.display = 'block';
        fetchUsers();
    } else {
        if(userManagementCard) userManagementCard.style.display = 'none';
    }
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('currentSection');
  window.location.replace('index.html');
}

// --- House Functions ---

function setupHouseFilters() {
    const yearFilter = document.getElementById('house-year-filter');
    if (yearFilter) {
        yearFilter.addEventListener('change', (e) => {
            fetchHouses(e.target.value);
        });
    }
}

async function fetchHouses(year = null) {
    try {
        const token = localStorage.getItem('token');
        let selectedYear = year || document.getElementById('house-year-filter')?.value;
        
        if (!selectedYear) {
            selectedYear = formatYearRange(new Date().getFullYear());
        }
        
        const res = await fetch(`${API_URL}/houses?year=${selectedYear}`, {
            headers: { 'x-auth-token': token }
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({ msg: 'Server Error' }));
            throw new Error(errorData.msg || 'Failed to fetch houses');
        }

        houses = await res.json();
        
        if (!Array.isArray(houses)) {
            console.error('Expected houses to be an array, got:', houses);
            houses = [];
        }
        
        // Custom sort: Try to sort numerically if possible
        houses.sort((a, b) => {
            const numA = parseInt(a.houseNumber.replace(/\D/g, '')) || 0;
            const numB = parseInt(b.houseNumber.replace(/\D/g, '')) || 0;
            if (numA === numB) {
                return a.houseNumber.localeCompare(b.houseNumber);
            }
            return numA - numB;
        });

        updateDashboardStats();
        renderHouses();
        populateHouseSelect();
    } catch (err) {
        console.error('Error fetching houses:', err);
        if (err.message.includes('401') || err.message.includes('token')) {
            logout();
        } else {
            showNotification('error', 'Retrieval Failed', err.message || 'Failed to retrieve house details');
        }
    }
}

function renderHouses(searchTerm = '') {
    const tbody = document.querySelector('#houses-table tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    const filteredHouses = houses.filter(h => 
        h.houseNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
        h.ownerName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    filteredHouses.forEach(house => {
        const tr = document.createElement('tr');
        
        // Safely create cells
        const tdHouse = document.createElement('td');
        tdHouse.textContent = house.houseNumber;
        tr.appendChild(tdHouse);
        
        const tdOwner = document.createElement('td');
        tdOwner.textContent = house.ownerName;
        tr.appendChild(tdOwner);
        
        const tdPhone = document.createElement('td');
        tdPhone.textContent = house.phoneNumber || '-';
        tr.appendChild(tdPhone);
        
        const tdStatus = document.createElement('td');
        const spanStatus = document.createElement('span');
        spanStatus.className = house.paymentStatus === 'Paid' ? 'status-paid' : 'status-unpaid';
        spanStatus.textContent = house.paymentStatus;
        tdStatus.appendChild(spanStatus);
        tr.appendChild(tdStatus);
        
        const tdActions = document.createElement('td');
        tdActions.innerHTML = `
            <button class="btn-primary" data-action="view-ledger" data-id="${house._id}" style="padding: 5px 10px; font-size: 12px;" title="View History Register">
                <i class="fas fa-book"></i> Register
            </button>
            <button class="btn-secondary" data-action="edit-house" data-id="${house._id}" style="padding: 5px 10px; font-size: 12px;">
                <i class="fas fa-edit"></i> Edit
            </button>
            <button class="btn-danger" data-action="delete-house" data-id="${house._id}" style="padding: 5px 10px; font-size: 12px;">
                <i class="fas fa-trash"></i> Delete
            </button>
        `;
        tr.appendChild(tdActions);

        tbody.appendChild(tr);
    });
}

function updateDashboardStats() {
    const currentYear = new Date().getFullYear();
    const paidHouses = houses.filter(h => h.paymentStatus === 'Paid');
    const unpaidHouses = houses.filter(h => h.paymentStatus === 'Unpaid');
    const totalCount = houses.length;

    document.getElementById('total-houses').textContent = totalCount;
    document.getElementById('paid-houses').textContent = paidHouses.length;
    document.getElementById('unpaid-houses').textContent = unpaidHouses.length;

    // Calculate Collection Progress
    const percentage = totalCount > 0 ? Math.round((paidHouses.length / totalCount) * 100) : 0;
    const progressBar = document.getElementById('collection-progress');
    if (progressBar) {
        progressBar.style.width = `${percentage}%`;
        progressBar.textContent = `${percentage}%`;
    }

    // Calculate Total Collected (This Year)
    let totalCollected = 0;
    const currentYearRange = formatYearRange(new Date().getFullYear());
    if (payments && payments.length > 0) {
        totalCollected = payments
            .filter(p => p.year === currentYearRange)
            .reduce((sum, p) => sum + (p.amount || 0), 0);
    }
    document.getElementById('total-collected').textContent = `₹${totalCollected.toLocaleString()}`;

    // Update Recent Payments List (Last 5)
    updateRecentPayments();
}

function updateRecentPayments() {
    const tbody = document.querySelector('#recent-payments-table tbody');
    if (!tbody || !payments) return;

    tbody.innerHTML = '';
    
    // Sort by date desc and take top 5
    const recent = [...payments]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);

    if (recent.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">No recent activity</td></tr>';
        return;
    }

    recent.forEach(p => {
        const tr = document.createElement('tr');
        
        const tdDate = document.createElement('td');
        tdDate.textContent = new Date(p.date).toLocaleDateString();
        tr.appendChild(tdDate);

        const tdHouse = document.createElement('td');
        tdHouse.textContent = p.house ? p.house.houseNumber : 'N/A';
        tr.appendChild(tdHouse);

        const tdOwner = document.createElement('td');
        tdOwner.textContent = p.house ? p.house.ownerName : 'N/A';
        tr.appendChild(tdOwner);

        const tdAmount = document.createElement('td');
        tdAmount.textContent = `₹${p.amount}`;
        tr.appendChild(tdAmount);

        const tdType = document.createElement('td');
        tdType.textContent = p.paymentType || 'Maintenance';
        tr.appendChild(tdType);

        const tdMode = document.createElement('td');
        tdMode.textContent = p.paymentMode;
        tr.appendChild(tdMode);

        tbody.appendChild(tr);
    });
}

async function handleHouseSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('house-id').value;
    const houseData = {
        houseNumber: document.getElementById('house-number').value,
        ownerName: document.getElementById('owner-name').value,
        phoneNumber: document.getElementById('phone-number').value,
        address: document.getElementById('address').value
    };

    const token = localStorage.getItem('token');
    let url = `${API_URL}/houses`;
    let method = 'POST';

    if (id) {
        url = `${API_URL}/houses/${id}`;
        method = 'PUT';
    }

    try {
        const res = await fetch(url, {
            method: method,
            headers: { 
                'Content-Type': 'application/json',
                'x-auth-token': token
            },
            body: JSON.stringify(houseData)
        });

        if (res.ok) {
            houseModal.style.display = 'none';
            fetchHouses(); // Refresh list
            showNotification('success', 'Success', 'House saved successfully');
        } else {
            showNotification('error', 'Error', 'Error saving house');
        }
    } catch (err) {
        console.error(err);
    }
}

window.editHouse = (id) => {
    const house = houses.find(h => h._id === id);
    if (house) {
        document.getElementById('modal-title').textContent = 'Edit House';
        document.getElementById('house-id').value = house._id;
        document.getElementById('house-number').value = house.houseNumber;
        document.getElementById('owner-name').value = house.ownerName;
        document.getElementById('phone-number').value = house.phoneNumber || '';
        document.getElementById('address').value = house.address || '';
        houseModal.style.display = 'block';
    }
};

window.deleteHouse = (id) => {
    showConfirmModal(
        'Delete House',
        'Are you sure you want to delete this house?',
        async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${API_URL}/houses/${id}`, {
                    method: 'DELETE',
                    headers: { 'x-auth-token': token }
                });
                
                if (res.ok) {
                    fetchHouses();
                    showNotification('success', 'Deleted', 'House deleted successfully');
                } else {
                    showNotification('error', 'Error', 'Failed to delete house');
                }
            } catch (err) {
                console.error(err);
                showNotification('error', 'Error', 'Server error');
            }
        }
    );
}


// --- Payment Functions ---

async function fetchPayments() {
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/payments`, {
            headers: { 'x-auth-token': token }
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({ msg: 'Server Error' }));
            throw new Error(errorData.msg || 'Failed to fetch payments');
        }

        payments = await res.json();
        
        if (!Array.isArray(payments)) {
            console.error('Expected payments to be an array, got:', payments);
            payments = [];
        }

        populateYearDropdowns(); // Update years based on data
        updateDashboardStats(); // Refresh stats with payment info
        renderHistory();
    } catch (err) {
        console.error('Error fetching payments', err);
        if (err.message.includes('401') || err.message.includes('token')) {
            logout();
        }
    }
}

function setupHistoryFilters() {
    const searchInput = document.getElementById('history-search');
    const dateInput = document.getElementById('history-date-filter');
    const yearSelect = document.getElementById('history-year-filter');
    const monthSelect = document.getElementById('history-month-filter');
    const modeSelect = document.getElementById('history-mode-filter');
    const clearBtn = document.getElementById('clear-history-filters');

    if (!searchInput || !dateInput || !yearSelect || !modeSelect || !clearBtn) return;

    // Event Listeners
    searchInput.addEventListener('input', filterHistory);
    dateInput.addEventListener('change', filterHistory);
    yearSelect.addEventListener('change', filterHistory);
    if (monthSelect) monthSelect.addEventListener('change', filterHistory);
    modeSelect.addEventListener('change', filterHistory);

    clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        dateInput.value = '';
        yearSelect.value = '';
        if (monthSelect) monthSelect.value = '';
        modeSelect.value = '';
        renderHistory(); // Reset to show all
    });
}

function setupExpenseFilters() {
    const searchInput = document.getElementById('expense-search');
    const fromInput = document.getElementById('expense-from-date');
    const toInput = document.getElementById('expense-to-date');
    const categorySelect = document.getElementById('expense-category-filter');
    const modeSelect = document.getElementById('expense-mode-filter');
    const clearBtn = document.getElementById('clear-expense-filters');

    if (!searchInput || !fromInput || !toInput || !categorySelect || !modeSelect || !clearBtn) return;

    const handler = () => filterExpenses();

    searchInput.addEventListener('input', handler);
    fromInput.addEventListener('change', handler);
    toInput.addEventListener('change', handler);
    categorySelect.addEventListener('change', handler);
    modeSelect.addEventListener('change', handler);

    clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        fromInput.value = '';
        toInput.value = '';
        categorySelect.value = '';
        modeSelect.value = '';
        renderExpenses();
    });
}

function filterHistory() {
    const searchTerm = document.getElementById('history-search').value.toLowerCase();
    const dateFilter = document.getElementById('history-date-filter').value;
    const yearFilter = document.getElementById('history-year-filter').value;
    const monthFilter = document.getElementById('history-month-filter') ? document.getElementById('history-month-filter').value : '';
    const modeFilter = document.getElementById('history-mode-filter').value;

    const filteredPayments = payments.filter(payment => {
        const houseNumber = payment.house ? payment.house.houseNumber.toLowerCase() : '';
        const ownerName = payment.house ? payment.house.ownerName.toLowerCase() : '';
        const paymentYear = payment.year ? payment.year.toString() : '';
        const pDate = new Date(payment.date);
        const pMonth = pDate.getMonth() + 1;
        
        let matchesDate = true;
        if (dateFilter) {
            const year = pDate.getFullYear();
            const month = String(pMonth).padStart(2, '0');
            const day = String(pDate.getDate()).padStart(2, '0');
            const paymentDateStr = `${year}-${month}-${day}`;
            matchesDate = paymentDateStr === dateFilter;
        }
        
        const matchesSearch = houseNumber.includes(searchTerm) || ownerName.includes(searchTerm);
        const matchesYear = yearFilter === '' || paymentYear === yearFilter;
        const matchesMonth = monthFilter === '' || pMonth === parseInt(monthFilter, 10);
        const matchesMode = modeFilter === '' || payment.paymentMode === modeFilter;

        return matchesSearch && matchesDate && matchesYear && matchesMonth && matchesMode;
    });

    renderHistory(filteredPayments);
}

function renderHistory(paymentsToRender = null) {
    const tbody = document.querySelector('#history-table tbody');
    if (!tbody) return;

    tbody.innerHTML = '';
    
    const list = paymentsToRender || payments;

    if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No payments found</td></tr>';
        return;
    }

    list.forEach(payment => {
        const tr = document.createElement('tr');
        const date = new Date(payment.date).toLocaleDateString();
        
        const tdDate = document.createElement('td');
        tdDate.textContent = date;
        tr.appendChild(tdDate);

        const tdReceipt = document.createElement('td');
        tdReceipt.textContent = payment.receiptNumber || '-';
        tr.appendChild(tdReceipt);

        const tdHouse = document.createElement('td');
        tdHouse.textContent = payment.house ? payment.house.houseNumber : 'N/A';
        tr.appendChild(tdHouse);

        const tdOwner = document.createElement('td');
        tdOwner.textContent = payment.house ? payment.house.ownerName : 'N/A';
        tr.appendChild(tdOwner);

        const tdAmount = document.createElement('td');
        tdAmount.textContent = `₹${payment.amount}`;
        tr.appendChild(tdAmount);

        const tdType = document.createElement('td');
        tdType.textContent = payment.paymentType || 'Maintenance';
        tr.appendChild(tdType);

        const tdMode = document.createElement('td');
        tdMode.textContent = payment.paymentMode;
        tr.appendChild(tdMode);

    const tdActions = document.createElement('td');
    tdActions.innerHTML = `
            <button class="btn-secondary" data-action="generate-receipt" data-id="${payment._id}" style="padding: 5px 10px; font-size: 12px;" title="Download Receipt">
                <i class="fas fa-file-pdf"></i> PDF
            </button>
            <button class="btn-danger" data-action="delete-payment" data-id="${payment._id}" style="padding: 5px 10px; font-size: 12px;" title="Delete Payment (Mark as Unpaid)">
                <i class="fas fa-trash"></i> Delete
            </button>
        `;
    tr.appendChild(tdActions);

        tbody.appendChild(tr);
    });
}

window.deletePayment = (id) => {
    showConfirmModal(
        'Delete Payment',
        'Are you sure you want to delete this payment? This will mark the house as Unpaid for this year.',
        async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${API_URL}/payments/${id}`, {
                    method: 'DELETE',
                    headers: { 'x-auth-token': token }
                });
                
                if (res.ok) {
                    fetchHouses(); // Refresh house status
                    fetchPayments(); // Refresh history
                    if (typeof loadReport === 'function') loadReport(); // Refresh report if open
                    showNotification('success', 'Deleted', 'Payment deleted and status updated.');
                } else {
                    showNotification('error', 'Error', 'Failed to delete payment');
                }
            } catch (err) {
                console.error(err);
                showNotification('error', 'Error', 'Server error');
            }
        }
    );
}

function populateHouseSelect() {
    const select = document.getElementById('payment-house-select');
    if (!select) return;
    
    // Clear existing options except first
    select.innerHTML = '<option value="">Select a house...</option>';

    houses.forEach(house => {
        const option = document.createElement('option');
        option.value = house._id;
        option.textContent = `${house.houseNumber} - ${house.ownerName}`;
        select.appendChild(option);
    });
}

async function handlePaymentSubmit(e) {
    e.preventDefault();
    let year = document.getElementById('payment-year').value;
    const manualYear = document.getElementById('payment-manual-year').value;

    if (year === 'Other' && manualYear) {
        year = manualYear;
    }

    let paymentType = document.getElementById('payment-type').value;
    const manualType = document.getElementById('payment-manual-type').value;

    if (paymentType === 'Other' && manualType) {
        paymentType = manualType;
    }

    const paymentData = {
        houseId: document.getElementById('payment-house-select').value,
        amount: document.getElementById('payment-amount').value,
        paymentType: paymentType,
        year: year,
        paymentMode: document.getElementById('payment-mode').value,
        transactionRef: document.getElementById('payment-ref').value,
        receiptNumber: document.getElementById('payment-receipt-number').value
    };

    const token = localStorage.getItem('token');

    try {
        const res = await fetch(`${API_URL}/payments`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'x-auth-token': token
            },
            body: JSON.stringify(paymentData)
        });

        const data = await res.json();

        if (res.ok) {
            showNotification('success', 'Success', 'Payment recorded successfully!');
            paymentForm.reset();
            // Reset defaults
            document.getElementById('payment-amount').value = 1200;
            document.getElementById('payment-year').value = formatYearRange(new Date().getFullYear());
            document.getElementById('payment-manual-year-group').style.display = 'none';
            document.getElementById('payment-manual-year').value = '';
            document.getElementById('payment-manual-type-group').style.display = 'none';
            document.getElementById('payment-manual-type').value = '';
            document.getElementById('payment-warning').style.display = 'none';
            // Clear manual receipt number
            document.getElementById('payment-receipt-number').value = '';
            
            fetchHouses(); // Update status
            fetchPayments(); // Update history
            
            // Generate receipt automatically
            generateReceiptPDF(data, houses.find(h => h._id === paymentData.houseId));
        } else {
            showNotification('error', 'Error', data.msg || 'Error recording payment');
        }
    } catch (err) {
        console.error(err);
    }
}

// PDF Generation
window.generateReceipt = (paymentId) => {
    const payment = payments.find(p => p._id === paymentId);
    if (payment && payment.house) {
        generateReceiptPDF(payment, payment.house);
    }
};

function generateReceiptPDF(payment, house) {
    try {
        if (!window.jspdf) {
            alert('PDF Library not loaded. Please refresh the page or check internet connection.');
            console.error('window.jspdf is undefined');
            return;
        }

        if (!house) {
            alert('Error: House details not found for this payment. Cannot generate receipt.');
            console.error('House not found for payment', payment);
            return;
        }

        console.log('Generating PDF for payment:', payment.receiptNumber);
        const { jsPDF } = window.jspdf;
        // Use A4 Portrait to fit two A5 receipts vertically
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const drawReceipt = (offsetY) => {
        console.log('Drawing receipt at offset:', offsetY);
        // Receipt Dimensions (A5 Landscape is approx 210mm x 148mm)
        // We will use almost full width of A4 (210mm)
        const pageWidth = 210;
        const pageHeight = 148; // Half of A4 roughly
        const margin = 10;
        const startY = offsetY + margin; // Content starts here
        const rectY = offsetY + margin;

        // Double Border
        doc.setLineWidth(0.5);
        doc.rect(margin, rectY, pageWidth - 2 * margin, pageHeight - 2 * margin); // Outer
        doc.setLineWidth(0.2);
        doc.rect(margin + 2, rectY + 2, pageWidth - 2 * margin - 4, pageHeight - 2 * margin - 4); // Inner

        // --- Header ---
        doc.setFont("times", "bold");
        doc.setFontSize(16);
        doc.setTextColor(20, 50, 120); // Dark Blue
        doc.text('Sri Vivekananda Mutually Aided Co-Operative', pageWidth / 2, startY + 12, { align: 'center' });
        doc.text('House Building Society Ltd., Bapatla', pageWidth / 2, startY + 20, { align: 'center' });

        // --- S.No and Date ---
        const topRowY = startY + 35;
        
        // S.No Label
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0); // Black
        doc.text('S.No:', margin + 10, topRowY);
        
        // Receipt Number (Red)
        doc.setFontSize(14);
        doc.setTextColor(200, 0, 0); // Red
        doc.text(payment.receiptNumber || '0000', margin + 25, topRowY);

        // Title: RECEIPT
        doc.setFontSize(14);
        doc.setTextColor(20, 50, 120); // Dark Blue
        doc.text('RECEIPT', pageWidth / 2, topRowY, { align: 'center' });
        doc.setLineWidth(0.5);
        doc.line((pageWidth / 2) - 12, topRowY + 1, (pageWidth / 2) + 12, topRowY + 1); // Underline

        // Date
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0); // Black
        doc.text('Date........................', pageWidth - margin - 50, topRowY);
        doc.text(new Date(payment.date).toLocaleDateString(), pageWidth - margin - 40, topRowY - 1); // Fill Date

        // --- Body ---
        const bodyStartY = startY + 50;
        const lineHeight = 12;
        doc.setFont("times", "normal");
        doc.setFontSize(12);
        
        // Helper to draw dotted line
        const drawDottedLine = (x, y, len) => {
            doc.setLineWidth(0.1);
            doc.setLineDashPattern([1, 1], 0);
            doc.line(x, y, x + len, y);
            doc.setLineDashPattern([], 0); // Reset
        };

        // Line 1: Received from
        let currentY = bodyStartY;
        doc.text('Received From Sri/Smt', margin + 10, currentY);
        drawDottedLine(margin + 55, currentY, 130);
        doc.setFont("times", "bold");
        doc.text(house.ownerName, margin + 60, currentY - 1); // Fill Name
        doc.setFont("times", "normal");

        // Line 2: House No & Purpose
        currentY += lineHeight;
        doc.text('H.No./P.No', margin + 10, currentY);
        drawDottedLine(margin + 35, currentY, 40);
        doc.setFont("times", "bold");
        doc.text(house.houseNumber, margin + 40, currentY - 1); // Fill House No
        doc.setFont("times", "normal");

        doc.text('Towards Watch & Ward /Establishment', margin + 80, currentY);
        
        // Line 3: Charges
        currentY += lineHeight;
        doc.text('Charges', margin + 10, currentY);
        drawDottedLine(margin + 30, currentY, 155);
        doc.setFont("times", "bold");
        const purpose = (payment.paymentType === 'Temple Fund') 
            ? `Temple Fund Contribution for Year ${payment.year}` 
            : `Maintenance Charges for Year ${payment.year}`;
        doc.text(purpose, margin + 35, currentY - 1); // Fill Purpose
        doc.setFont("times", "normal");

        // Line 4: Rupees
        currentY += lineHeight;
        doc.text('Rupees', margin + 10, currentY);
        drawDottedLine(margin + 30, currentY, 155);
        doc.setFont("times", "bold");
        
        // Convert amount to words
        const amountInWords = numberToWords(payment.amount);
        doc.text(amountInWords, margin + 35, currentY - 1); 
        doc.setFont("times", "normal");

        // Line 5: Payment Mode
        currentY += lineHeight;
        doc.text('through Bank Chalana / D.D.No', margin + 10, currentY);
        drawDottedLine(margin + 70, currentY, 115);
        doc.setFont("times", "bold");
        let modeText = payment.paymentMode;
        if(payment.transactionRef) modeText += ` (${payment.transactionRef})`;
        doc.text(modeText, margin + 75, currentY - 1);
        doc.setFont("times", "normal");

        // --- Footer ---
        const footerY = rectY + pageHeight - 2 * margin - 20;

        // Rs Box
        doc.setFillColor(20, 50, 120); // Dark Blue
        doc.rect(margin + 10, footerY, 15, 10, 'F'); // Blue box
        doc.setTextColor(255, 255, 255); // White
        doc.setFont("times", "bold");
        doc.setFontSize(14);
        doc.text('Rs.', margin + 12, footerY + 7);
        
        // Amount Box
        doc.setDrawColor(20, 50, 120);
        doc.rect(margin + 25, footerY, 40, 10); // Border box
        doc.setTextColor(0, 0, 0); // Black
        doc.text(`${payment.amount}/-`, margin + 28, footerY + 7);

        // Signature Block
        doc.setFontSize(10);
        doc.setTextColor(20, 50, 120);
        doc.text('For Sri Vivekananda Mutually Aided Co-Operative', pageWidth - margin - 10, footerY - 5, { align: 'right' });
        doc.text('House Building Society Ltd., Bapatla', pageWidth - margin - 10, footerY, { align: 'right' });
        
        doc.setFontSize(12);
        doc.setFont("times", "italic");
        doc.text('President', pageWidth - margin - 25, footerY + 15, { align: 'right' });
    };

    // Draw Top Receipt
    drawReceipt(0);

    // Draw Cut Line (Dashed)
    doc.setLineWidth(0.5);
    doc.setLineDashPattern([3, 3], 0);
    doc.setTextColor(150);
    doc.line(10, 148.5, 200, 148.5); // Center line approx
    doc.setFontSize(8);
    doc.text('Cut Here', 105, 147, { align: 'center' });
    doc.setLineDashPattern([], 0); // Reset

    // Draw Bottom Receipt
    drawReceipt(148.5);

    doc.save(`Receipt_${payment.receiptNumber}.pdf`);
    } catch (err) {
        console.error('PDF Generation Error:', err);
        alert('Failed to generate PDF receipt. Please try again from History.');
    }
}

window.generateCollectionReceipt = async (idOrData) => {
    let collection;
    if (typeof idOrData === 'string') {
        collection = collections.find(c => c._id === idOrData);
        if (!collection) {
            // Try fetching if not in state
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${API_URL}/collections/${idOrData}`, {
                    headers: { 'x-auth-token': token }
                });
                collection = await res.json();
            } catch (err) {
                showNotification('error', 'Error', 'Could not find collection data');
                return;
            }
        }
    } else {
        collection = idOrData;
    }

    if (!collection) return;

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

        const drawReceipt = (offsetY) => {
            const margin = 10;
            const width = 190;
            const height = 130;
            const startY = offsetY + margin;

            // Border
            doc.setLineWidth(0.5);
            doc.rect(margin, startY, width, height);
            doc.setLineWidth(0.2);
            doc.rect(margin + 2, startY + 2, width - 4, height - 4);

            // Header
            doc.setFont("helvetica", "bold");
            doc.setFontSize(16);
            doc.setTextColor(20, 50, 120);
            doc.text('SRI VIVEKANANDA MUTUALLY AIDED CO-OPERATIVE', 105, startY + 15, { align: 'center' });
            doc.setFontSize(14);
            doc.text('HOUSE BUILDING SOCIETY LTD., BAPATLA', 105, startY + 23, { align: 'center' });
            doc.setFontSize(10);
            doc.text('(Regd. No. AMC/GNT/DCO/2012/4818)', 105, startY + 28, { align: 'center' });

            // Title
            doc.setFontSize(14);
            doc.text('COLLECTION RECEIPT', 105, startY + 40, { align: 'center' });
            doc.line(85, startY + 42, 125, startY + 42);

            // Receipt Info
            doc.setFontSize(12);
            doc.setTextColor(0, 0, 0);
            doc.text(`Receipt No: ${collection.receiptNumber}`, margin + 10, startY + 55);
            doc.text(`Date: ${new Date(collection.date).toLocaleDateString()}`, margin + 140, startY + 55);

            // Body
            doc.setFont("helvetica", "normal");
            let payerInfo = collection.collectionType === 'Hundi' ? collection.payerName : (collection.house ? `${collection.house.ownerName} (H.No: ${collection.house.houseNumber})` : 'N/A');
            
            let y = startY + 70;
            doc.text(`Received with thanks from:`, margin + 10, y);
            doc.setFont("helvetica", "bold");
            doc.text(payerInfo, margin + 65, y);
            doc.setFont("helvetica", "normal");
            doc.line(65, y + 1, margin + 180, y + 1);

            y += 12;
            doc.text(`Towards:`, margin + 10, y);
            doc.setFont("helvetica", "bold");
            doc.text(collection.collectionType, margin + 30, y);
            doc.setFont("helvetica", "normal");
            doc.line(30, y + 1, margin + 180, y + 1);
            
            if (collection.remarks) {
                y += 12;
                doc.text(`Remarks:`, margin + 10, y);
                doc.setFont("helvetica", "bold");
                doc.text(collection.remarks, margin + 30, y);
                doc.setFont("helvetica", "normal");
                doc.line(30, y + 1, margin + 180, y + 1);
            }

            y += 12;
            doc.text(`Payment Mode:`, margin + 10, y);
            doc.setFont("helvetica", "bold");
            const modeText = `${collection.paymentMode} ${collection.transactionRef ? '(' + collection.transactionRef + ')' : ''}`;
            doc.text(modeText, margin + 45, y);
            doc.setFont("helvetica", "normal");
            doc.line(45, y + 1, margin + 180, y + 1);

            // Amount Box
            const boxY = startY + height - 20; // was -25, moved further down
            doc.setLineWidth(0.5);
            doc.rect(margin + 10, boxY, 50, 10); // reduced size
            doc.setFont("helvetica", "bold");
            doc.setFontSize(12); // reduced text size
            doc.text(`Rs. ${collection.amount.toLocaleString('en-IN')}/-`, margin + 15, boxY + 7); // adjusted Y for smaller box

            // Signature
            doc.setFontSize(12);
            doc.text('Authorized Signatory', margin + 140, startY + height - 15);
        };

        drawReceipt(0);
        
        doc.save(`Receipt_${collection.receiptNumber}.pdf`);
    } catch (err) {
        console.error('PDF Error:', err);
        showNotification('error', 'Error', 'Failed to generate PDF');
    }
};

window.downloadReconReport = async () => {
    const date = prompt("Enter date for reconciliation (YYYY-MM-DD) or leave empty for today:", new Date().toISOString().split('T')[0]);
    if (date === null) return;

    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/collections/reconciliation?date=${date}`, {
            headers: { 'x-auth-token': token }
        });
        const data = await res.json();

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text('Daily Collection Reconciliation Report', 105, 20, { align: 'center' });
        doc.setFontSize(12);
        doc.text(`Date: ${new Date(data.date).toLocaleDateString()}`, 105, 30, { align: 'center' });

        doc.autoTable({
            startY: 40,
            head: [['Collection Type', 'Total Amount']],
            body: [
                ['BMC Rent', `Rs. ${data.totals['BMC Rent'].toLocaleString('en-IN')}`],
                ['Transfer Fee', `Rs. ${data.totals['Transfer Fee'].toLocaleString('en-IN')}`],
                ['Hundi', `Rs. ${data.totals['Hundi'].toLocaleString('en-IN')}`],
                ['GRAND TOTAL', `Rs. ${data.totals['Total'].toLocaleString('en-IN')}`]
            ],
            theme: 'striped',
            headStyles: { fillColor: [20, 50, 120] }
        });

        doc.autoTable({
            startY: doc.lastAutoTable.finalY + 15,
            head: [['Receipt #', 'Type', 'Payer/House', 'Amount', 'Mode']],
            body: data.items.map(c => [
                c.receiptNumber,
                c.collectionType,
                c.collectionType === 'Hundi' ? c.payerName : (c.house ? `${c.house.houseNumber}` : 'N/A'),
                `Rs. ${c.amount.toLocaleString('en-IN')}`,
                c.paymentMode
            ]),
            theme: 'grid'
        });

        doc.save(`Reconciliation_Report_${date}.pdf`);
    } catch (err) {
        console.error('Report Error:', err);
        showNotification('error', 'Error', 'Failed to generate report');
    }
};

// --- Reports Functions ---

/**
 * Helper to format year into range format (e.g., 2026 -> 2026-27)
 */
function formatYearRange(year) {
    if (!year) return '';
    const startYear = parseInt(year);
    const endYearShort = (startYear + 1).toString().slice(-2);
    return `${startYear}-${endYearShort}`;
}

function populateYearDropdowns() {
    const reportSelect = document.getElementById('report-year-select');
    const historySelect = document.getElementById('history-year-filter');
    const houseSelect = document.getElementById('house-year-filter');
    const paymentYearSelect = document.getElementById('payment-year');
    
    const reportTypeSelect = document.getElementById('report-type-select');
    
    // Determine available years and types
    const currentYear = new Date().getFullYear();
    let years = new Set();
    let types = new Set(['Maintenance', 'Temple Fund']);
    
    // Default range: From 2024 up to 10 years into the future
    const startBaseYear = 2024;
    const futureLimit = currentYear + 10;
    
    for (let y = startBaseYear; y <= futureLimit; y++) {
        years.add(y);
    }

    // Add years and types from actual payments
    if (payments && payments.length > 0) {
        payments.forEach(p => {
            if (p.year) {
                const y = parseInt(p.year.split('-')[0]);
                if (!isNaN(y)) years.add(y);
            }
            if (p.paymentType) {
                types.add(p.paymentType);
            }
        });
    }

    const sortedStartYears = Array.from(years).sort((a, b) => b - a); // Descending

    // Helper to populate a select element
    const populate = (selectElement, defaultText) => {
        if (!selectElement) return;
        const currentVal = selectElement.value;
        selectElement.innerHTML = defaultText ? `<option value="">${defaultText}</option>` : '';
        
        sortedStartYears.forEach(y => {
            const yearRange = formatYearRange(y);
            const option = document.createElement('option');
            option.value = yearRange;
            option.textContent = yearRange;
            selectElement.appendChild(option);
        });

        const currentYearRange = formatYearRange(currentYear);

        // Restore selection if valid, or select current year for report/houses
        if (currentVal && sortedStartYears.map(y => formatYearRange(y)).includes(currentVal)) {
            selectElement.value = currentVal;
        } else if (!defaultText) {
            // For report/house/payment select (no default text), select current year range by default
            selectElement.value = currentYearRange;
        }
    };

    populate(reportSelect, null);
    populate(historySelect, 'All Years');
    populate(houseSelect, null);
    populate(paymentYearSelect, null);

    // Populate report type select with dynamic types
    if (reportTypeSelect) {
        const currentType = reportTypeSelect.value;
        reportTypeSelect.innerHTML = '';
        Array.from(types).sort().forEach(t => {
            const option = document.createElement('option');
            option.value = t;
            option.textContent = t;
            reportTypeSelect.appendChild(option);
        });
        if (currentType && Array.from(types).includes(currentType)) {
            reportTypeSelect.value = currentType;
        }
    }

    // Add "Other" option to the entry select and setup manual input listener
    if (paymentYearSelect) {
        const otherOption = document.createElement('option');
        otherOption.value = 'Other';
        otherOption.textContent = 'Other (Manual Entry)';
        paymentYearSelect.appendChild(otherOption);

        const manualGroup = document.getElementById('payment-manual-year-group');
        const manualInput = document.getElementById('payment-manual-year');

        paymentYearSelect.addEventListener('change', (e) => {
            if (e.target.value === 'Other') {
                if (manualGroup) manualGroup.style.display = 'block';
                if (manualInput) {
                    manualInput.required = true;
                    manualInput.focus();
                }
            } else {
                if (manualGroup) manualGroup.style.display = 'none';
                if (manualInput) {
                    manualInput.required = false;
                    manualInput.value = '';
                }
            }
        });
    }
}

window.loadReport = async () => {
    const year = document.getElementById('report-year-select').value;
    const type = document.getElementById('report-type-select').value;
    const month = document.getElementById('report-month-select') ? document.getElementById('report-month-select').value : '';
    const token = localStorage.getItem('token');
    
    try {
        const encodedType = encodeURIComponent(type);
        const monthParam = month ? `&month=${encodeURIComponent(month)}` : '';
        const res = await fetch(`${API_URL}/reports/${year}?type=${encodedType}${monthParam}`, {
            headers: { 'x-auth-token': token }
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({ msg: 'Server Error' }));
            throw new Error(errorData.msg || 'Failed to load report');
        }

        const data = await res.json();
        currentReportData = data;
        
        // Update stats
        document.getElementById('report-total').textContent = data.stats.total;
        document.getElementById('report-paid-count').textContent = data.stats.paid;
        document.getElementById('report-unpaid-count').textContent = data.stats.unpaid;

        // Populate Paid Table
        const paidTbody = document.querySelector('#report-paid-table tbody');
        paidTbody.innerHTML = '';
        data.paid.forEach(h => {
            const tr = document.createElement('tr');
            
            const tdHouse = document.createElement('td');
            tdHouse.textContent = h.houseNumber;
            tr.appendChild(tdHouse);

            const tdOwner = document.createElement('td');
            tdOwner.textContent = h.ownerName;
            tr.appendChild(tdOwner);

            const tdType = document.createElement('td');
            tdType.textContent = h.paymentType || type;
            tr.appendChild(tdType);

            const tdDate = document.createElement('td');
            tdDate.textContent = new Date(h.paymentDate).toLocaleDateString();
            tr.appendChild(tdDate);

            paidTbody.appendChild(tr);
        });

        // Populate Unpaid Table
        const unpaidTbody = document.querySelector('#report-unpaid-table tbody');
        unpaidTbody.innerHTML = '';
        data.unpaid.forEach(h => {
            const tr = document.createElement('tr');
            
            const tdHouse = document.createElement('td');
            tdHouse.textContent = h.houseNumber;
            tr.appendChild(tdHouse);

            const tdOwner = document.createElement('td');
            tdOwner.textContent = h.ownerName;
            tr.appendChild(tdOwner);

            unpaidTbody.appendChild(tr);
        });

    } catch (err) {
        console.error('Error loading report', err);
        showNotification('error', 'Error', 'Failed to load report');
    }
};

window.downloadReportList = (type) => {
    if (!currentReportData) {
        showNotification('warning', 'Warning', 'Please load the report first.');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const year = document.getElementById('report-year-select').value;
    const paymentCategory = document.getElementById('report-type-select').value;
    
    // Header
    doc.setFont("times", "bold");
    doc.setFontSize(18);
    doc.setTextColor(44, 62, 80); // Dark Blue
    doc.text('Sri Vivekananda Mutually Aided Co-Operative', 105, 15, { align: 'center' });
    doc.setFontSize(14);
    doc.text('House Building Society Ltd., Bapatla', 105, 22, { align: 'center' });
    
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text(`${paymentCategory} - ${type} Members List - ${year}`, 105, 35, { align: 'center' });
    
    // Table Data
    const tableColumn = type === 'Paid' 
        ? ["S.No", "House #", "Owner Name", "Type", "Payment Date"]
        : ["S.No", "House #", "Owner Name"];
        
    const tableRows = [];
    const list = type === 'Paid' ? currentReportData.paid : currentReportData.unpaid;

    if (list.length === 0) {
        showNotification('info', 'Info', `No ${type} members to download.`);
        return;
    }

    list.forEach((house, index) => {
        const rowData = [
            index + 1,
            house.houseNumber,
            house.ownerName
        ];
        if (type === 'Paid') {
            rowData.push(house.paymentType || paymentCategory);
            rowData.push(new Date(house.paymentDate).toLocaleDateString());
        }
        tableRows.push(rowData);
    });

    // AutoTable
    doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 40,
        theme: 'grid',
        headStyles: { 
            fillColor: type === 'Paid' ? [39, 174, 96] : [192, 57, 43],
            textColor: 255,
            fontStyle: 'bold'
        },
        styles: { 
            font: "times",
            fontSize: 10, 
            cellPadding: 3 
        },
        columnStyles: {
            0: { cellWidth: 15, halign: 'center' }, // S.No
            1: { cellWidth: 25, halign: 'center' }, // House #
            // Owner Name takes remaining
            // Date
        }
    });
    
    // Footer with Page Numbers
    const pageCount = doc.internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.setTextColor(150);
        doc.text('Page ' + i + ' of ' + pageCount, doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 10, {align: 'right'});
        doc.text('Generated on: ' + new Date().toLocaleString(), 20, doc.internal.pageSize.height - 10);
    }

    doc.save(`${type}_Members_${year}.pdf`);
};

function setupPaymentFormListeners() {
    const houseSelect = document.getElementById('payment-house-select');
    const yearInput = document.getElementById('payment-year');
    const typeSelect = document.getElementById('payment-type');
    const manualTypeGroup = document.getElementById('payment-manual-type-group');
    const manualTypeInput = document.getElementById('payment-manual-type');

    if (houseSelect && yearInput && typeSelect) {
        const check = () => checkDuplicatePayment();
        houseSelect.addEventListener('change', check);
        yearInput.addEventListener('input', check);
        typeSelect.addEventListener('change', (e) => {
            if (e.target.value === 'Other') {
                if (manualTypeGroup) manualTypeGroup.style.display = 'block';
                if (manualTypeInput) {
                    manualTypeInput.required = true;
                    manualTypeInput.focus();
                }
            } else {
                if (manualTypeGroup) manualTypeGroup.style.display = 'none';
                if (manualTypeInput) {
                    manualTypeInput.required = false;
                    manualTypeInput.value = '';
                }
            }
            check();
        });
    }
}

function checkDuplicatePayment() {
    const houseId = document.getElementById('payment-house-select').value;
    const year = parseInt(document.getElementById('payment-year').value);
    const type = document.getElementById('payment-type').value;
    const warningEl = document.getElementById('payment-warning');

    console.log('Checking duplicate:', { houseId, year, type });

    if (!houseId || !year || !type) {
        if(warningEl) warningEl.style.display = 'none';
        return;
    }

    const duplicate = payments.find(p => {
        if (!p.house) return false;
        // Handle both populated object and direct ID string cases, and ensure string comparison
        const pHouseId = p.house._id || p.house; 
        
        const matchHouse = pHouseId.toString() === houseId;
        const matchYear = parseInt(p.year) === year;
        const matchType = (p.paymentType || 'Maintenance') === type;
        
        if (matchHouse && matchYear && matchType) {
            console.log('Duplicate found:', p);
            return true;
        }
        return false;
    });

    if (duplicate && warningEl) {
        warningEl.textContent = `Warning: This house has already paid ${type} for ${year} (Receipt #${duplicate.receiptNumber}).`;
        warningEl.style.display = 'block';
    } else if (warningEl) {
        warningEl.style.display = 'none';
    }
}

// --- User Management & Profile ---

function setupProfileListeners() {
    const changeUsernameForm = document.getElementById('change-username-form');
    const changePasswordForm = document.getElementById('change-password-form');
    const addUserBtn = document.getElementById('add-user-btn');
    const closeUserBtn = document.querySelector('.close-user');
    const userModal = document.getElementById('user-modal');
    const userForm = document.getElementById('user-form');

    if (changeUsernameForm) {
        changeUsernameForm.addEventListener('submit', handleChangeUsernameSubmit);
    }

    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', handleChangePasswordSubmit);
    }
    
    if (addUserBtn) {
        addUserBtn.addEventListener('click', () => {
            if (userForm) userForm.reset();
            if (userModal) userModal.style.display = 'block';
        });
    }

    if (closeUserBtn) {
        closeUserBtn.addEventListener('click', () => {
             if (userModal) userModal.style.display = 'none';
        });
    }

    if (userForm) {
        userForm.addEventListener('submit', handleAddUserSubmit);
    }

    // Close user modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target == userModal) {
            userModal.style.display = 'none';
        }
    });
}

async function fetchUsers() {
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/auth/users`, {
            headers: { 'x-auth-token': token }
        });
        
        if (res.status === 403) {
             // Not admin
             return;
        }

        const users = await res.json();
        renderUsers(users);
    } catch (err) {
        console.error('Error fetching users', err);
    }
}

function renderUsers(users) {
    const tbody = document.querySelector('#users-table tbody');
    if (!tbody) return;

    tbody.innerHTML = '';
    
    if (!Array.isArray(users)) return;

    users.forEach(user => {
        const tr = document.createElement('tr');
        
        const tdName = document.createElement('td');
        tdName.textContent = user.username;
        tr.appendChild(tdName);

        const tdRole = document.createElement('td');
        tdRole.textContent = user.role || 'viewer';
        tr.appendChild(tdRole);
        
        const tdActions = document.createElement('td');
        if (currentUser && user._id === currentUser._id) {
             tdActions.innerHTML = '<span style="color: #999;">(You)</span>';
        } else {
             tdActions.innerHTML = `<button class="btn-danger" data-action="delete-user" data-id="${user._id}" style="padding: 5px 10px; font-size: 12px;">
                 <i class="fas fa-trash"></i> Delete
             </button>`;
        }
        tr.appendChild(tdActions);

        tbody.appendChild(tr);
    });
}

async function handleAddUserSubmit(e) {
    e.preventDefault();
    const username = document.getElementById('user-username').value;
    const password = document.getElementById('user-password').value;
    const role = document.getElementById('user-role').value;

    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/auth/create-user`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'x-auth-token': token
            },
            body: JSON.stringify({ username, password, role })
        });

        const data = await res.json();

        if (res.ok) {
            document.getElementById('user-modal').style.display = 'none';
            fetchUsers();
            showNotification('success', 'Success', 'User created successfully');
        } else {
            showNotification('error', 'Error', data.msg || 'Failed to create user');
        }
    } catch (err) {
        showNotification('error', 'Error', 'Server connection error');
    }
}

async function handleChangeUsernameSubmit(e) {
    e.preventDefault();
    const newUsername = document.getElementById('new-username').value;

    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/auth/update-profile`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'x-auth-token': token
            },
            body: JSON.stringify({ username: newUsername })
        });

        const data = await res.json();

        if (res.ok) {
            showNotification('success', 'Success', 'Username updated');
            // Update local user info
            if (currentUser) currentUser.username = newUsername;
            const welcomeMsg = document.querySelector('.user-info span');
            if (welcomeMsg) welcomeMsg.textContent = `Welcome, ${newUsername} (${currentUser.role || 'User'})`;
        } else {
            showNotification('error', 'Error', data.msg || 'Failed to update username');
        }
    } catch (err) {
        showNotification('error', 'Error', 'Server connection error');
    }
}

// --- Expense & Voucher Functions ---

function setupExpenseListeners() {
    const addExpenseBtn = document.getElementById('add-expense-btn');
    const closeExpenseBtn = document.querySelector('.close-expense');
    const expenseFormContainer = document.getElementById('expense-form-container');
    const expenseForm = document.getElementById('expense-form');

    if (addExpenseBtn) {
        addExpenseBtn.addEventListener('click', () => {
            expenseForm.reset();
            document.getElementById('expense-date').valueAsDate = new Date();
            expenseFormContainer.style.display = 'block';
            addExpenseBtn.style.display = 'none'; // Hide add button when form is open
            expenseFormContainer.scrollIntoView({ behavior: 'smooth' });
        });
    }

    if (closeExpenseBtn) {
        closeExpenseBtn.addEventListener('click', () => {
            expenseFormContainer.style.display = 'none';
            addExpenseBtn.style.display = 'inline-flex'; // Show add button back
        });
    }

    if (expenseForm) {
        expenseForm.addEventListener('submit', handleExpenseSubmit);
        
        // Dynamic narration for 'Other' category
        const categorySelect = document.getElementById('expense-category');
        const otherGroup = document.getElementById('expense-other-category-group');
        const otherInput = document.getElementById('expense-other-category');
        
        if (categorySelect && otherGroup && otherInput) {
            categorySelect.addEventListener('change', (e) => {
                if (e.target.value === 'Other') {
                    otherGroup.style.display = 'block';
                    otherInput.required = true;
                    otherInput.focus();
                } else {
                    otherGroup.style.display = 'none';
                    otherInput.required = false;
                    otherInput.value = '';
                }
            });
        }
    }
}

async function fetchExpenses() {
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/expenses`, {
            headers: { 'x-auth-token': token }
        });
        
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({ msg: 'Server Error' }));
            throw new Error(errorData.msg || 'Failed to fetch expenses');
        }

        expenses = await res.json();
        filterExpenses();
        populateCalendarFilters();
    } catch (err) {
        console.error('Error fetching expenses:', err);
        showNotification('error', 'Retrieval Failed', err.message || 'Failed to retrieve expenses');
    }
}

function filterExpenses() {
    if (!Array.isArray(expenses)) {
        expenses = [];
    }

    const searchInput = document.getElementById('expense-search');
    const fromInput = document.getElementById('expense-from-date');
    const toInput = document.getElementById('expense-to-date');
    const yearSelect = document.getElementById('expense-year-filter');
    const monthSelect = document.getElementById('expense-month-filter');
    const categorySelect = document.getElementById('expense-category-filter');
    const modeSelect = document.getElementById('expense-mode-filter');

    if (!searchInput || !fromInput || !toInput || !categorySelect || !modeSelect) {
        renderExpenses();
        return;
    }

    const searchTerm = searchInput.value.toLowerCase();
    const fromDate = fromInput.value;
    const toDate = toInput.value;
    const yearFilter = yearSelect ? yearSelect.value : '';
    const monthFilter = monthSelect ? monthSelect.value : '';
    const categoryFilter = categorySelect.value;
    const modeFilter = modeSelect.value;

    const filtered = expenses.filter(expense => {
        const paidTo = (expense.paidTo || '').toLowerCase();
        const description = (expense.description || '').toLowerCase();
        const category = expense.category || '';
        const mode = expense.paymentMode || '';

        const matchesSearch = searchTerm === '' || paidTo.includes(searchTerm) || description.includes(searchTerm);
        const matchesCategory = categoryFilter === '' || category === categoryFilter;
        const matchesMode = modeFilter === '' || mode === modeFilter;

        let matchesFrom = true;
        let matchesTo = true;
        let matchesYear = true;
        let matchesMonth = true;

        const d = new Date(expense.paymentDate);
        const y = d.getFullYear();
        const mNum = d.getMonth() + 1;
        const m = String(mNum).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${day}`;

        if (fromDate) {
            matchesFrom = dateStr >= fromDate;
        }
        if (toDate) {
            matchesTo = dateStr <= toDate;
        }
        if (yearFilter) {
            matchesYear = y === parseInt(yearFilter, 10);
        }
        if (monthFilter) {
            matchesMonth = mNum === parseInt(monthFilter, 10);
        }

        return matchesSearch && matchesCategory && matchesMode && matchesFrom && matchesTo && matchesYear && matchesMonth;
    });

    renderExpenses(filtered);
}

function renderExpenses(expensesToRender = null) {
    const tbody = document.querySelector('#expenses-table tbody');
    if (!tbody) return;

    tbody.innerHTML = '';
    const list = expensesToRender || expenses;
    list.forEach(expense => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${new Date(expense.paymentDate).toLocaleDateString()}</td>
            <td>${expense.voucherNumber}</td>
            <td>${expense.paidTo}</td>
            <td>${expense.category}</td>
            <td>₹${expense.amount.toLocaleString('en-IN')}</td>
            <td>${expense.paymentMode}</td>
            <td>
                <button class="btn-secondary" data-action="generate-voucher" data-id="${expense._id}" style="padding: 5px 10px; font-size: 12px;">
                    <i class="fas fa-file-pdf"></i> Voucher
                </button>
                <button class="btn-danger" data-action="delete-expense" data-id="${expense._id}" style="padding: 5px 10px; font-size: 12px;">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function setupExpenseFilters() {
    const searchInput = document.getElementById('expense-search');
    const fromInput = document.getElementById('expense-from-date');
    const toInput = document.getElementById('expense-to-date');
    const yearSelect = document.getElementById('expense-year-filter');
    const monthSelect = document.getElementById('expense-month-filter');
    const categorySelect = document.getElementById('expense-category-filter');
    const modeSelect = document.getElementById('expense-mode-filter');
    const clearBtn = document.getElementById('clear-expense-filters');

    if (!searchInput || !fromInput || !toInput || !categorySelect || !modeSelect || !clearBtn) return;

    const handler = () => filterExpenses();

    searchInput.addEventListener('input', handler);
    fromInput.addEventListener('change', handler);
    toInput.addEventListener('change', handler);
    if (yearSelect) yearSelect.addEventListener('change', handler);
    if (monthSelect) monthSelect.addEventListener('change', handler);
    categorySelect.addEventListener('change', handler);
    modeSelect.addEventListener('change', handler);

    clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        fromInput.value = '';
        toInput.value = '';
        if (yearSelect) yearSelect.value = '';
        if (monthSelect) monthSelect.value = '';
        categorySelect.value = '';
        modeSelect.value = '';
        renderExpenses();
    });
}

function populateCalendarFilters() {
    const collYearSelect = document.getElementById('coll-year-filter');
    const expenseYearSelect = document.getElementById('expense-year-filter');
    if (collYearSelect) {
        const years = new Set();
        collections.forEach(c => {
            const d = new Date(c.date);
            years.add(d.getFullYear());
        });
        const currentVal = collYearSelect.value;
        collYearSelect.innerHTML = '<option value=\"\">All Years</option>';
        Array.from(years).sort((a, b) => b - a).forEach(y => {
            const opt = document.createElement('option');
            opt.value = y.toString();
            opt.textContent = y.toString();
            collYearSelect.appendChild(opt);
        });
        if (currentVal && Array.from(years).includes(parseInt(currentVal, 10))) {
            collYearSelect.value = currentVal;
        }
    }
    if (expenseYearSelect) {
        const years = new Set();
        expenses.forEach(e => {
            const d = new Date(e.paymentDate);
            years.add(d.getFullYear());
        });
        const currentVal = expenseYearSelect.value;
        expenseYearSelect.innerHTML = '<option value=\"\">All Years</option>';
        Array.from(years).sort((a, b) => b - a).forEach(y => {
            const opt = document.createElement('option');
            opt.value = y.toString();
            opt.textContent = y.toString();
            expenseYearSelect.appendChild(opt);
        });
        if (currentVal && Array.from(years).includes(parseInt(currentVal, 10))) {
            expenseYearSelect.value = currentVal;
        }
    }
}

async function handleExpenseSubmit(e) {
    e.preventDefault();
    let category = document.getElementById('expense-category').value;
    const otherCategory = document.getElementById('expense-other-category').value;
    
    // Use the narration as category if 'Other' is selected
    if (category === 'Other' && otherCategory) {
        category = otherCategory;
    }

    const data = {
        paidTo: document.getElementById('expense-paid-to').value,
        category: category,
        amount: parseFloat(document.getElementById('expense-amount').value),
        paymentMode: document.getElementById('expense-mode').value,
        referenceNumber: document.getElementById('expense-reference').value,
        paymentDate: document.getElementById('expense-date').value,
        description: document.getElementById('expense-description').value,
        voucherNumber: document.getElementById('expense-voucher-number').value
    };

    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/expenses`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'x-auth-token': token
            },
            body: JSON.stringify(data)
        });

        const newExpense = await res.json();
        if (res.ok) {
            document.getElementById('expense-form-container').style.display = 'none';
            const addExpenseBtn = document.getElementById('add-expense-btn');
            if (addExpenseBtn) addExpenseBtn.style.display = 'inline-flex';
            
            showNotification('success', 'Success', 'Expense recorded successfully');
            await fetchExpenses();
            // Automatically generate voucher
            generateVoucherPDF(newExpense);
        } else {
            showNotification('error', 'Error', newExpense.msg || 'Failed to record expense');
        }
    } catch (err) {
        showNotification('error', 'Error', 'Server connection error');
    }
}

// --- Special Collection Functions ---

function setupCollectionListeners() {
    const addCollBtn = document.getElementById('add-collection-btn');
    const closeCollBtn = document.querySelector('.close-collection');
    const collFormContainer = document.getElementById('collection-form-container');
    const collForm = document.getElementById('collection-form');
    const collTypeSelect = document.getElementById('collection-type');

    if (addCollBtn) {
        addCollBtn.addEventListener('click', () => {
            collForm.reset();
            const manualTypeGroup = document.getElementById('coll-manual-type-group');
            if(manualTypeGroup) manualTypeGroup.style.display = 'none';
            document.getElementById('collection-date').valueAsDate = new Date();
            collFormContainer.style.display = 'block';
            addCollBtn.style.display = 'none';
            collFormContainer.scrollIntoView({ behavior: 'smooth' });
            populateCollectionHouses();
        });
    }

    if (closeCollBtn) {
        closeCollBtn.addEventListener('click', () => {
            collFormContainer.style.display = 'none';
            addCollBtn.style.display = 'inline-flex';
        });
    }

    if (collTypeSelect) {
        collTypeSelect.addEventListener('change', (e) => {
            const houseGroup = document.getElementById('coll-house-group');
            const payerGroup = document.getElementById('coll-payer-group');
            const manualTypeGroup = document.getElementById('coll-manual-type-group');
            const manualTypeInput = document.getElementById('collection-manual-type');
            
            if (e.target.value === 'Hundi') {
                houseGroup.style.display = 'none';
                payerGroup.style.display = 'block';
                manualTypeGroup.style.display = 'none';
                if(manualTypeInput) manualTypeInput.required = false;
            } else if (e.target.value === 'Other') {
                houseGroup.style.display = 'block'; // Manual types usually for houses
                payerGroup.style.display = 'none';
                manualTypeGroup.style.display = 'block';
                if(manualTypeInput) {
                    manualTypeInput.required = true;
                    manualTypeInput.focus();
                }
            } else {
                houseGroup.style.display = 'block';
                payerGroup.style.display = 'none';
                manualTypeGroup.style.display = 'none';
                if(manualTypeInput) manualTypeInput.required = false;
            }
        });
    }

    if (collForm) {
        collForm.addEventListener('submit', handleCollectionSubmit);
    }

    // Setup Filter Listeners
    const searchInput = document.getElementById('coll-search');
    const dateInput = document.getElementById('coll-date-filter');
    const typeSelect = document.getElementById('coll-type-filter');
    const yearSelect = document.getElementById('coll-year-filter');
    const monthSelect = document.getElementById('coll-month-filter');
    const clearBtn = document.getElementById('clear-coll-filters');

    if (searchInput) searchInput.addEventListener('input', filterCollections);
    if (dateInput) dateInput.addEventListener('change', filterCollections);
    if (typeSelect) typeSelect.addEventListener('change', filterCollections);
    if (yearSelect) yearSelect.addEventListener('change', filterCollections);
    if (monthSelect) monthSelect.addEventListener('change', filterCollections);
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            dateInput.value = '';
            typeSelect.value = '';
            if (yearSelect) yearSelect.value = '';
            if (monthSelect) monthSelect.value = '';
            renderCollections();
        });
    }
}

function populateCollectionHouses() {
    const houseSelect = document.getElementById('collection-house');
    if (!houseSelect) return;
    
    houseSelect.innerHTML = '<option value="">Select House</option>';
    // Use the existing global houses array
    houses.sort((a, b) => a.houseNumber.localeCompare(b.houseNumber, undefined, { numeric: true })).forEach(house => {
        const option = document.createElement('option');
        option.value = house._id;
        option.textContent = `${house.houseNumber} - ${house.ownerName}`;
        houseSelect.appendChild(option);
    });
}

async function fetchCollections() {
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/collections`, {
            headers: { 'x-auth-token': token }
        });
        
        if (!res.ok) {
            let errorMsg = `Error: ${res.status} ${res.statusText}`;
            try {
                const errorData = await res.json();
                errorMsg = errorData.msg || errorMsg;
            } catch (e) {}
            throw new Error(errorMsg);
        }

        collections = await res.json();
        renderCollections();
        populateCalendarFilters();
    } catch (err) {
        console.error('Error fetching collections:', err);
        showNotification('error', 'Error', 'Failed to retrieve collections: ' + err.message);
    }
}

function filterCollections() {
    const searchTerm = document.getElementById('coll-search').value.toLowerCase();
    const dateFilter = document.getElementById('coll-date-filter').value;
    const typeFilter = document.getElementById('coll-type-filter').value;
    const yearFilter = document.getElementById('coll-year-filter') ? document.getElementById('coll-year-filter').value : '';
    const monthFilter = document.getElementById('coll-month-filter') ? document.getElementById('coll-month-filter').value : '';

    const filtered = collections.filter(c => {
        const receipt = (c.receiptNumber || '').toLowerCase();
        const houseNum = c.house ? c.house.houseNumber.toLowerCase() : '';
        const owner = c.house ? c.house.ownerName.toLowerCase() : '';
        const payer = (c.payerName || '').toLowerCase();
        const type = c.collectionType || '';
        const d = new Date(c.date);
        const cYear = d.getFullYear();
        const cMonth = d.getMonth() + 1;
        
        const matchesSearch = searchTerm === '' || 
            receipt.includes(searchTerm) || 
            houseNum.includes(searchTerm) || 
            owner.includes(searchTerm) || 
            payer.includes(searchTerm) ||
            type.toLowerCase().includes(searchTerm);
            
        const matchesType = typeFilter === '' || type === typeFilter;
        
        let matchesDate = true;
        if (dateFilter) {
            const dateStr = d.toISOString().split('T')[0];
            matchesDate = dateStr === dateFilter;
        }
        const matchesYear = yearFilter === '' || cYear === parseInt(yearFilter, 10);
        const matchesMonth = monthFilter === '' || cMonth === parseInt(monthFilter, 10);

        return matchesSearch && matchesType && matchesDate && matchesYear && matchesMonth;
    });

    renderCollections(filtered);
}

function renderCollections(dataToRender = null) {
    const tbody = document.querySelector('#collections-table tbody');
    const totalShownEl = document.getElementById('coll-total-shown');
    if (!tbody) return;

    tbody.innerHTML = '';
    const list = dataToRender || collections;
    let total = 0;

    list.forEach(c => {
        total += c.amount;
        const tr = document.createElement('tr');
        const isHundi = c.collectionType.toLowerCase().includes('hundi');
        const fromInfo = isHundi ? c.payerName : (c.house ? `${c.house.houseNumber} (${c.house.ownerName})` : 'N/A');
        
        tr.innerHTML = `
            <td>${new Date(c.date).toLocaleDateString()}</td>
            <td>${c.receiptNumber}</td>
            <td>${c.collectionType}</td>
            <td>${fromInfo}</td>
            <td>₹${c.amount.toLocaleString('en-IN')}</td>
            <td>${c.paymentMode}</td>
            <td>
                <button class="btn-secondary" data-action="generate-coll-receipt" data-id="${c._id}" title="Print Receipt">
                    <i class="fas fa-print"></i>
                </button>
                <button class="btn-danger" data-action="delete-collection" data-id="${c._id}" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    if (totalShownEl) {
        totalShownEl.textContent = `₹${total.toLocaleString('en-IN')}`;
    }
}

async function handleCollectionSubmit(e) {
    e.preventDefault();
    let collectionType = document.getElementById('collection-type').value;
    const manualType = document.getElementById('collection-manual-type').value;
    
    if (collectionType === 'Other') {
        collectionType = manualType || 'Miscellaneous';
    }
    
    const houseId = document.getElementById('collection-house').value;
    const payerName = document.getElementById('collection-payer').value;
    const amount = parseFloat(document.getElementById('collection-amount').value);
    const paymentMode = document.getElementById('collection-mode').value;
    const transactionRef = document.getElementById('collection-reference').value;
    const date = document.getElementById('collection-date').value;
    const remarks = document.getElementById('collection-remarks').value;
    const receiptNumber = document.getElementById('collection-receipt-number').value;

    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/collections`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': token
            },
            body: JSON.stringify({
                collectionType, houseId, payerName, amount, paymentMode, transactionRef, date, remarks, receiptNumber
            })
        });

        let data;
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            data = await res.json();
        } else {
            const text = await res.text();
            throw new Error(`Server returned non-JSON response: ${res.status} ${res.statusText}`);
        }

        if (res.ok) {
            showNotification('success', 'Success', 'Collection recorded');
            document.getElementById('collection-form-container').style.display = 'none';
            const addCollBtn = document.getElementById('add-collection-btn');
            if (addCollBtn) addCollBtn.style.display = 'inline-flex';
            
            fetchCollections();
            // Automatically generate receipt
            try {
                generateCollectionReceipt(data);
            } catch (pdfErr) {
                console.error('PDF Receipt Generation Error:', pdfErr);
                showNotification('warning', 'Receipt Error', 'Collection recorded but receipt generation failed.');
            }
        } else {
            showNotification('error', 'Error', data.msg || 'Failed to record collection');
        }
    } catch (err) {
        console.error('Frontend handleCollectionSubmit error:', err);
        showNotification('error', 'Error', 'Server error: ' + err.message);
    }
}

window.deleteCollection = (id) => {
    showConfirmModal('Delete Collection', 'Are you sure you want to delete this collection record?', async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/collections/${id}`, {
                method: 'DELETE',
                headers: { 'x-auth-token': token }
            });

            if (res.ok) {
                showNotification('success', 'Deleted', 'Collection record removed');
                fetchCollections();
            } else {
                showNotification('error', 'Error', 'Failed to delete record');
            }
        } catch (err) {
            showNotification('error', 'Error', 'Server connection error');
        }
    });
};

window.deleteExpense = (id) => {
    showConfirmModal('Delete Expense', 'Are you sure you want to delete this expense record?', async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/expenses/${id}`, {
                method: 'DELETE',
                headers: { 'x-auth-token': token }
            });

            if (res.ok) {
                showNotification('success', 'Deleted', 'Expense record removed');
                fetchExpenses();
            } else {
                showNotification('error', 'Error', 'Failed to delete record');
            }
        } catch (err) {
            showNotification('error', 'Error', 'Server connection error');
        }
    });
};

window.downloadAllVouchers = () => {
    if (expenses.length === 0) {
        showNotification('info', 'No Data', 'No expenses recorded to download vouchers.');
        return;
    }
    generateVoucherPDF(expenses);
};

window.generateVoucherPDF = (expenseOrArray) => {
    let voucherData = [];
    let isSingle = false;

    if (Array.isArray(expenseOrArray)) {
        voucherData = expenseOrArray;
    } else {
        isSingle = true;
        let expense;
        if (typeof expenseOrArray === 'string') {
            expense = expenses.find(e => e._id === expenseOrArray);
        } else {
            expense = expenseOrArray;
        }
        
        if (!expense) {
            console.error('Expense not found for voucher generation:', expenseOrArray);
            showNotification('error', 'Voucher Error', 'Could not find expense data for voucher.');
            return;
        }
        voucherData = [expense];
    }

    console.log('Generating vouchers for:', voucherData.length, 'records');
    try {
        if (!window.jspdf) {
            console.error('jsPDF library not found on window object');
            alert('PDF Library not loaded. Please refresh the page.');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4' 
        });

        const pageWidth = doc.internal.pageSize.width; // 210mm
        const pageHeight = doc.internal.pageSize.height; // 297mm

        const drawVoucher = (expense, offsetY) => {
            const margin = 10;
            const width = pageWidth - (margin * 2);
            const height = 130; // was (pageHeight / 2) - margin - 5; 
            const startX = margin;
            const startY = offsetY + margin;

            // --- Background & Main Container ---
            doc.setDrawColor(0);
            doc.setLineWidth(0.5);
            doc.rect(startX, startY, width, height); // Main outer box
            
            // --- Header Section (Classic Style) ---
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(16);
            doc.setTextColor(0);
            doc.text('SRI VIVEKANANDA MUTUALLY AIDED CO-OPERATIVE', pageWidth / 2, startY + 12, { align: 'center' });
            doc.setFontSize(12);
            doc.text('HOUSE BUILDING SOCIETY LTD., BAPATLA', pageWidth / 2, startY + 18, { align: 'center' });
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text('(Regd. No. AMC/GNT/DCO/2012/4818)', pageWidth / 2, startY + 23, { align: 'center' });

            // Horizontal Line under Header
            doc.setLineWidth(0.8);
            doc.line(startX, startY + 28, startX + width, startY + 28);

            // --- Voucher Title & Metadata ---
            doc.setFontSize(18);
            doc.setFont('times', 'bolditalic');
            doc.text('Payment Voucher', pageWidth / 2, startY + 38, { align: 'center' });

            // Vertical Dividers for Voucher # and Date
            doc.setLineWidth(0.3);
            doc.line(startX + (width / 2), startY + 42, startX + (width / 2), startY + 52); // Small vertical line
            
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.text(`Voucher No:`, startX + 10, startY + 48);
            doc.setFont('helvetica', 'normal');
            doc.text(`${expense.voucherNumber}`, startX + 40, startY + 48);
            
            doc.setFont('helvetica', 'bold');
            doc.text(`Date:`, startX + (width / 2) + 10, startY + 48);
            doc.setFont('helvetica', 'normal');
            doc.text(`${new Date(expense.paymentDate).toLocaleDateString('en-GB')}`, startX + (width / 2) + 25, startY + 48);

            // Divider before body
            doc.line(startX, startY + 52, startX + width, startY + 52);

            // --- Main Content Area (Ledger Style) ---
            let currentY = startY + 65;
            const labelX = startX + 15;
            const contentX = startX + 55;
            const endX = startX + width - 60;

            // Row Helper
            const drawLedgerRow = (label, content, y) => {
                doc.setFont('helvetica', 'bold');
                doc.text(label, labelX, y);
                doc.setFont('times', 'normal');
                doc.setFontSize(12);
                doc.text(content || '', contentX, y);
                
                // Dotted line for the value
                doc.setLineDashPattern([0.5, 1], 0);
                doc.line(contentX, y + 1, endX, y + 1);
                doc.setLineDashPattern([], 0);
            };

            doc.setFontSize(11);
            drawLedgerRow('Paid To:', expense.paidTo, currentY);
            currentY += 15;
            drawLedgerRow('The Sum of:', `Rupees ${expense.amount.toLocaleString('en-IN')} only`, currentY);
            currentY += 15;
            drawLedgerRow('Towards:', expense.description, currentY);
            currentY += 15;
            drawLedgerRow('Mode:', `${expense.paymentMode} ${expense.referenceNumber ? '(' + expense.referenceNumber + ')' : ''}`, currentY);
            currentY += 15;

            const boxWidth = 50;
            const boxHeight = 10;
            const boxX = startX + width - boxWidth - 10; // slightly more to the right
            const boxY = Math.min(startY + height - 35, currentY + 10);
            doc.setLineWidth(1);
            doc.rect(boxX, boxY, boxWidth, boxHeight);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.text('Rs.', boxX + 3, boxY + 7);
            doc.setFontSize(12);
            doc.text(`${expense.amount.toLocaleString('en-IN')}/-`, boxX + 17, boxY + 7);

            // --- Accountant Signature (Fixed Position) ---
            doc.setFontSize(10);
            const sigY = startY + height - 10;
            
            // Accountant
            const accCenter = startX + width * 0.2;
            doc.line(accCenter - 25, sigY - 5, accCenter + 25, sigY - 5);
            doc.text('Accountant', accCenter, sigY, { align: 'center' });
            
            // Secretary / President
            const secCenter = startX + width * 0.5;
            doc.line(secCenter - 30, sigY - 5, secCenter + 30, sigY - 5);
            doc.text('Secretary/President', secCenter, sigY, { align: 'center' });
            
            // Receiver
            const recCenter = startX + width * 0.8;
            doc.line(recCenter - 30, sigY - 5, recCenter + 30, sigY - 5);
            doc.text('Receiver\'s Signature', recCenter, sigY, { align: 'center' });
        };

        if (isSingle) {
            // One expense, one copy
            drawVoucher(voucherData[0], 0);
        } else {
            // Batch of different expenses
            for (let i = 0; i < voucherData.length; i++) {
                if (i > 0) {
                    doc.addPage();
                }
                drawVoucher(voucherData[i], 0);
            }
        }

        const fileName = isSingle ? `Voucher_${voucherData[0].voucherNumber}.pdf` : `Vouchers_Batch_${new Date().toLocaleDateString('en-GB')}.pdf`;
        doc.save(fileName);
    } catch (err) {
        console.error('PDF Generation Error:', err);
        showNotification('error', 'PDF Error', 'Failed to generate Voucher PDF.');
    }
}

async function handleChangePasswordSubmit(e) {
    e.preventDefault();
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;

    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/auth/change-password`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'x-auth-token': token
            },
            body: JSON.stringify({ oldPassword: currentPassword, newPassword: newPassword })
        });

        const data = await res.json();

        if (res.ok) {
            showNotification('success', 'Success', 'Password updated successfully');
            e.target.reset();
        } else {
            showNotification('error', 'Error', data.msg || 'Failed to update password');
        }
    } catch (err) {
        showNotification('error', 'Error', 'Server connection error');
    }
}

window.deleteUser = (userId) => {
    showConfirmModal('Delete User', 'Are you sure you want to delete this user?', async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/auth/users/${userId}`, {
                method: 'DELETE',
                headers: { 'x-auth-token': token }
            });

            const data = await res.json();

            if (res.ok) {
                showNotification('success', 'Success', 'User deleted');
                fetchUsers();
            } else {
                showNotification('error', 'Error', data.msg || 'Failed to delete user');
            }
        } catch (err) {
            showNotification('error', 'Error', 'Server connection error');
        }
    });
};

/**
 * Helper to convert number to words (Indian Numbering System)
 */
function numberToWords(num) {
    if (num === 0) return 'Zero only';
    
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty ', 'Thirty ', 'Forty ', 'Fifty ', 'Sixty ', 'Seventy ', 'Eighty ', 'Ninety '];

    const format = (n, suffix) => {
        if (n === 0) return '';
        if (n > 19) {
            return b[Math.floor(n / 10)] + a[n % 10] + suffix;
        }
        return a[n] + suffix;
    };

    let str = '';
    str += format(Math.floor(num / 10000000), 'Crore ');
    str += format(Math.floor((num / 100000) % 100), 'Lakh ');
    str += format(Math.floor((num / 1000) % 100), 'Thousand ');
    str += format(Math.floor((num / 100) % 10), 'Hundred ');
    
    let lastTwo = num % 100;
    if (num > 100 && lastTwo > 0) str += 'and ';
    str += format(lastTwo, '');
    
    return str.trim() + ' only';
}

/**
 * Individual House Ledger Functions
 */
async function openHouseLedger(houseId) {
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/ledger/${houseId}/ledger`, {
            headers: { 'x-auth-token': token }
        });

        if (!res.ok) throw new Error('Failed to fetch ledger data');

        const data = await res.json();
        renderLedgerData(data);
        
        // Show modal
        document.getElementById('ledger-modal').style.display = 'block';
        
        // Setup PDF button for this specific house
        const pdfBtn = document.getElementById('download-ledger-btn');
        pdfBtn.onclick = () => generateLedgerPDF(data);

    } catch (err) {
        console.error('Ledger Error:', err);
        showNotification('error', 'Error', 'Failed to open house register');
    }
}

function renderLedgerData(data) {
    const { house, history } = data;
    
    // Header info
    const infoContainer = document.getElementById('ledger-house-info');
    infoContainer.innerHTML = `
        <div>
            <p><strong>House Number:</strong> ${house.houseNumber}</p>
            <p><strong>Owner Name:</strong> ${house.ownerName}</p>
        </div>
        <div>
            <p><strong>Phone:</strong> ${house.phoneNumber || 'N/A'}</p>
            <p><strong>Address:</strong> ${house.address || 'N/A'}</p>
        </div>
    `;

    // Payments Table
    const paymentsTbody = document.querySelector('#ledger-payments-table tbody');
    paymentsTbody.innerHTML = '';
    if (history.payments.length === 0) {
        paymentsTbody.innerHTML = '<tr><td colspan="6" style="text-align:center">No payment history found</td></tr>';
    } else {
        history.payments.forEach(p => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${new Date(p.date).toLocaleDateString()}</td>
                <td>${p.receiptNumber}</td>
                <td>${p.year}</td>
                <td>${p.paymentType}</td>
                <td>₹${p.amount}</td>
                <td>${p.paymentMode}</td>
            `;
            paymentsTbody.appendChild(tr);
        });
    }

    // Collections Table
    const collectionsTbody = document.querySelector('#ledger-collections-table tbody');
    collectionsTbody.innerHTML = '';
    if (history.collections.length === 0) {
        collectionsTbody.innerHTML = '<tr><td colspan="6" style="text-align:center">No rent/fee history found</td></tr>';
    } else {
        history.collections.forEach(c => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${new Date(c.date).toLocaleDateString()}</td>
                <td>${c.receiptNumber}</td>
                <td>${c.collectionType}</td>
                <td>₹${c.amount}</td>
                <td>${c.paymentMode}</td>
                <td>${c.remarks || '-'}</td>
            `;
            collectionsTbody.appendChild(tr);
        });
    }
}

async function generateLedgerPDF(data) {
    const { house, history } = data;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.setTextColor(20, 50, 120);
    doc.text('HOUSE OWNER REGISTER / LEDGER', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`House Number: ${house.houseNumber}`, 20, 35);
    doc.text(`Owner Name: ${house.ownerName}`, 20, 42);
    doc.text(`Phone: ${house.phoneNumber || 'N/A'}`, 140, 35);
    doc.text(`Generated On: ${new Date().toLocaleDateString()}`, 140, 42);
    
    doc.setLineWidth(0.5);
    doc.line(20, 48, 190, 48);

    // Section 1: Maintenance & Temple Fund
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('1. Maintenance & Temple Fund Payments', 20, 58);
    
    const paymentRows = history.payments.map(p => [
        new Date(p.date).toLocaleDateString(),
        p.receiptNumber,
        p.year,
        p.paymentType,
        `Rs. ${p.amount}`,
        p.paymentMode
    ]);

    doc.autoTable({
        startY: 62,
        head: [['Date', 'Receipt #', 'Year', 'Type', 'Amount', 'Mode']],
        body: paymentRows.length > 0 ? paymentRows : [['-', '-', '-', 'No records', '-', '-']],
        theme: 'striped',
        headStyles: { fillColor: [20, 50, 120] }
    });

    // Section 2: Rent & Transfer Fees
    let nextY = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('2. Rent & Transfer Fee Collections', 20, nextY);
    
    const collectionRows = history.collections.map(c => [
        new Date(c.date).toLocaleDateString(),
        c.receiptNumber,
        c.collectionType,
        `Rs. ${c.amount}`,
        c.paymentMode,
        c.remarks || '-'
    ]);

    doc.autoTable({
        startY: nextY + 4,
        head: [['Date', 'Receipt #', 'Type', 'Amount', 'Mode', 'Remarks']],
        body: collectionRows.length > 0 ? collectionRows : [['-', '-', 'No records', '-', '-', '-']],
        theme: 'striped',
        headStyles: { fillColor: [40, 120, 80] }
    });

    doc.save(`Ledger_House_${house.houseNumber}.pdf`);
}
