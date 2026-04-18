document.querySelectorAll('.sidebar-category[data-toggle]').forEach(function(el) {
  el.addEventListener('click', function() {
    this.classList.toggle('collapsed');
  });
});

function getChosung(text) {
  const chosung = [
    'ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'
  ];
  return Array.from(text).map(char => {
    const code = char.charCodeAt(0);
    if (code < 0xac00 || code > 0xd7a3) return char;
    const index = Math.floor((code - 0xac00) / 588);
    return chosung[index] || char;
  }).join('');
}

function initTransactionListPage() {
  const customersFromMaster = JSON.parse(localStorage.getItem('customers') || '[]')
    .map(customer => (customer && customer.name ? String(customer.name).trim() : ''))
    .filter(Boolean);

  // 로컬스토리지에서 데이터만 로드 (초기화 하지 않음)
  const transactionsData = JSON.parse(localStorage.getItem('transactions') || '{}');
  const transactions = [];
  
  Object.keys(transactionsData).forEach(id => {
    // "new"인 거래번호는 제외
    if (id === 'new') return;
    
    const data = transactionsData[id];
    const amount = data.items.reduce((sum, item) => {
      const supply = item.quantity * item.unitPrice;
      const tax = data.taxType === 'exclude' ? 0 : Math.round(supply * 0.1);
      return sum + supply + tax;
    }, 0).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    transactions.push({
      id,
      customer: data.customer,
      project: data.projectName,
      details: data.items.map(item => item.product).join(', '),
      amount,
      created: new Date().toISOString().split('T')[0],
      updated: new Date().toISOString().split('T')[0]
    });
  });

  // 거래처관리 기준을 우선 사용하고, 주문 데이터의 거래처를 보조로 합쳐 자동완성 누락을 방지한다.
  const customersFromTransactions = transactions
    .map(item => (item.customer ? String(item.customer).trim() : ''))
    .filter(Boolean);
  const customers = [...new Set([...customersFromMaster, ...customersFromTransactions])].sort();

  const pageSize = 10;
  let currentPage = 1;
  let filteredTransactions = [...transactions];

  const customerInput = document.getElementById('search-customer');
  const projectInput = document.getElementById('search-project');
  const fromYearInput = document.getElementById('search-from-year');
  const fromMonthInput = document.getElementById('search-from-month');
  const toYearInput = document.getElementById('search-to-year');
  const toMonthInput = document.getElementById('search-to-month');
  const tableBody = document.getElementById('transaction-table-body');
  const paginationElement = document.getElementById('transaction-pagination');
  const suggestions = document.getElementById('customer-suggestions');
  const searchForm = document.getElementById('transaction-search-form');
  const resetButton = document.getElementById('search-reset');

  // Populate year and month selects
  const currentYear = new Date().getFullYear();
  for (let year = currentYear - 1; year <= currentYear + 1; year++) {
    const option = document.createElement('option');
    option.value = year;
    option.textContent = year;
    fromYearInput.appendChild(option.cloneNode(true));
    toYearInput.appendChild(option.cloneNode(true));
  }
  for (let month = 1; month <= 12; month++) {
    const option = document.createElement('option');
    option.value = month.toString().padStart(2, '0');
    option.textContent = month;
    fromMonthInput.appendChild(option.cloneNode(true));
    toMonthInput.appendChild(option.cloneNode(true));
  }

  // Set default values (current year: 01 ~ 12)
  fromYearInput.value = currentYear;
  fromMonthInput.value = '01';
  toYearInput.value = currentYear;
  toMonthInput.value = '12';

  function getFromValue() {
    const year = fromYearInput.value;
    const month = fromMonthInput.value;
    return year && month ? `${year}-${month}` : '';
  }

  function getToValue() {
    const year = toYearInput.value;
    const month = toMonthInput.value;
    return year && month ? `${year}-${month}` : '';
  }

  function renderTransactions() {
    const start = (currentPage - 1) * pageSize;
    const sortedTransactions = [...filteredTransactions].reverse();
    const pageItems = sortedTransactions.slice(start, start + pageSize);
    tableBody.innerHTML = pageItems.map(item => `
      <tr data-id="${item.id}">
        <td><input type="checkbox" class="form-check-input row-checkbox" data-id="${item.id}"></td>
        <td>${item.id}</td>
        <td>${item.customer}</td>
        <td>${item.project}</td>
        <td>${item.details}</td>
        <td>${item.amount}</td>
        <td>${item.created}</td>
        <td>${item.updated}</td>
      </tr>
    `).join('') || '<tr><td colspan="8" class="text-center">검색결과가 없습니다.</td></tr>';
    renderPagination();
  }

  function renderPagination() {
    const totalPages = Math.ceil(filteredTransactions.length / pageSize) || 1;
    const pages = [];
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    pages.push({ label: '‹', page: Math.max(1, currentPage - 1), disabled: currentPage === 1 });
    for (let i = startPage; i <= endPage; i += 1) {
      pages.push({ label: i, page: i, active: i === currentPage });
    }
    pages.push({ label: '›', page: Math.min(totalPages, currentPage + 1), disabled: currentPage === totalPages });

    paginationElement.innerHTML = pages.map(item => `
      <li class="page-item ${item.disabled ? 'disabled' : ''} ${item.active ? 'active' : ''}">
        <button class="page-link" type="button" data-page="${item.page}" ${item.disabled ? 'tabindex="-1" aria-disabled="true"' : ''}>
          ${item.label}
        </button>
      </li>
    `).join('');
  }

  function updateFilteredTransactions() {
    const customerValue = customerInput.value.trim();
    const projectValue = projectInput.value.trim();
    const fromValue = getFromValue();
    const toValue = getToValue();

    filteredTransactions = transactions.filter(item => {
      const matchCustomer = !customerValue || item.customer.includes(customerValue) || getChosung(item.customer).includes(customerValue);
      const matchProject = !projectValue || item.project.includes(projectValue);
      const matchFrom = !fromValue || item.created >= fromValue;
      const matchTo = !toValue || item.created <= toValue;
      return matchCustomer && matchProject && matchFrom && matchTo;
    });
    currentPage = 1;
    renderTransactions();
  }

  function showCustomerSuggestions(value) {
    if (!value) {
      suggestions.innerHTML = '';
      suggestions.classList.remove('show');
      return;
    }

    const keyword = value.trim();
    const matched = customers.filter(name =>
      name.includes(keyword) || getChosung(name).includes(keyword)
    );

    suggestions.innerHTML = matched.slice(0, 6).map(name => `
      <li class="list-group-item list-group-item-action suggestion-item" role="option" tabindex="0" data-value="${name}">${name}</li>
    `).join('');
    suggestions.classList.toggle('show', matched.length > 0);
  }

  function clearCustomerSuggestions() {
    suggestions.innerHTML = '';
    suggestions.classList.remove('show');
  }

  customerInput.addEventListener('input', e => {
    showCustomerSuggestions(e.target.value);
  });

  suggestions.addEventListener('click', e => {
    const item = e.target.closest('.suggestion-item');
    if (!item) return;
    customerInput.value = item.dataset.value;
    clearCustomerSuggestions();
  });

  suggestions.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const item = e.target.closest('.suggestion-item');
      if (!item) return;
      customerInput.value = item.dataset.value;
      clearCustomerSuggestions();
    }
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('.position-relative')) {
      clearCustomerSuggestions();
    }
  });

  paginationElement.addEventListener('click', e => {
    const button = e.target.closest('button[data-page]');
    if (!button) return;
    const page = Number(button.dataset.page);
    if (!Number.isNaN(page) && page !== currentPage) {
      currentPage = page;
      renderTransactions();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  searchForm.addEventListener('submit', e => {
    e.preventDefault();
    updateFilteredTransactions();
  });

  resetButton.addEventListener('click', () => {
    customerInput.value = '';
    projectInput.value = '';
    fromYearInput.value = '';
    fromMonthInput.value = '';
    toYearInput.value = '';
    toMonthInput.value = '';
    clearCustomerSuggestions();
    updateFilteredTransactions();
  });

  const selectAllCheckbox = document.getElementById('select-all-checkbox');
  const deleteBtn = document.getElementById('delete-transaction-btn');
  const createBtn = document.getElementById('create-transaction-btn');
  const deleteConfirmModal = new bootstrap.Modal(document.getElementById('deleteConfirmModal'));
  const deleteCompleteModal = new bootstrap.Modal(document.getElementById('deleteCompleteModal'));
  const deleteConfirmMessage = document.getElementById('deleteConfirmMessage');
  const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
  let pendingDeleteIds = [];

  selectAllCheckbox.addEventListener('change', () => {
    document.querySelectorAll('.row-checkbox').forEach(checkbox => {
      checkbox.checked = selectAllCheckbox.checked;
    });
  });

  deleteBtn.addEventListener('click', () => {
    const checkedIds = Array.from(document.querySelectorAll('.row-checkbox:checked')).map(cb => cb.dataset.id);
    if (checkedIds.length === 0) {
      alert('삭제할 주문을 선택해주세요.');
      return;
    }
    pendingDeleteIds = checkedIds;
    deleteConfirmMessage.textContent = `선택된 ${checkedIds.length}개의 주문을 삭제하시겠습니까?`;
    deleteConfirmModal.show();
  });

  confirmDeleteBtn.addEventListener('click', () => {
    if (pendingDeleteIds.length === 0) return;
    
    const transactions = JSON.parse(localStorage.getItem('transactions') || '{}');
    pendingDeleteIds.forEach(id => {
      delete transactions[id];
    });
    localStorage.setItem('transactions', JSON.stringify(transactions));
    
    selectAllCheckbox.checked = false;
    updateFilteredTransactions();
    deleteConfirmModal.hide();
    pendingDeleteIds = [];
    deleteCompleteModal.show();
  });

  const deleteCompleteBtn = document.getElementById('deleteCompleteBtn');
  if (deleteCompleteBtn) {
    deleteCompleteBtn.addEventListener('click', () => {
      deleteCompleteModal.hide();
    });
  }

  if (createBtn) {
    createBtn.addEventListener('click', () => {
      window.location.href = 'transaction_detail.html?id=new';
    });
  }

  tableBody.addEventListener('click', e => {
    if (e.target.classList.contains('row-checkbox')) return;
    const row = e.target.closest('tr');
    if (!row) return;
    const cells = row.querySelectorAll('td');
    if (cells.length < 2) return;
    const id = cells[1].textContent.trim();
    if (id) {
      window.location.href = `transaction_detail.html?id=${id}`;
    }
  });

  renderTransactions();
}

document.addEventListener('DOMContentLoaded', function() {
  if (document.querySelector('.transaction-list-page')) {
    initTransactionListPage();
  }
});
