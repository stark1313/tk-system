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
  const customers = [
    '삼호건설', '대신산업', '성진토건', '동양건설', '한솔기업', '대림건설', '태성건축', '금강개발', '신화건설', '정운산업'
  ];

  const sampleData = [
    { id: '2026-0001', customer: '삼호건설', project: '광교 리모델링', details: '철거 및 내장 공사', amount: '12,500,000', created: '2026-04-01', updated: '2026-04-05' },
    { id: '2026-0002', customer: '대신산업', project: '상암 APT 신축', details: '콘크리트 타설', amount: '35,000,000', created: '2026-03-22', updated: '2026-03-24' },
    { id: '2026-0003', customer: '성진토건', project: '송파 빌딩 보수', details: '외벽 도장', amount: '8,900,000', created: '2026-03-15', updated: '2026-03-18' },
    { id: '2026-0004', customer: '동양건설', project: '서초 오피스 증축', details: '철골 구조물 설치', amount: '22,000,000', created: '2026-03-10', updated: '2026-03-14' },
    { id: '2026-0005', customer: '한솔기업', project: '구월동 상가 리모델링', details: '전기/설비 공사', amount: '14,200,000', created: '2026-03-08', updated: '2026-03-12' },
    { id: '2026-0006', customer: '대림건설', project: '부천 아파트 외장', details: '창호 및 단열', amount: '18,400,000', created: '2026-03-01', updated: '2026-03-05' },
    { id: '2026-0007', customer: '태성건축', project: '강남 오피스 리노베이션', details: '내장 및 마감', amount: '11,600,000', created: '2026-02-25', updated: '2026-02-28' },
    { id: '2026-0008', customer: '금강개발', project: '수원 빌딩 증축', details: '철근 콘크리트 공사', amount: '28,900,000', created: '2026-02-20', updated: '2026-02-24' },
    { id: '2026-0009', customer: '신화건설', project: '영등포 상가 신축', details: '기초 및 골조', amount: '26,000,000', created: '2026-02-18', updated: '2026-02-22' },
    { id: '2026-0010', customer: '정운산업', project: '안양 주택 리모델링', details: '욕실 및 주방 교체', amount: '9,800,000', created: '2026-02-10', updated: '2026-02-14' },
    { id: '2026-0011', customer: '삼호건설', project: '인천 물류창고 신축', details: '지붕 및 외벽 마감', amount: '31,500,000', created: '2026-02-02', updated: '2026-02-06' },
    { id: '2026-0012', customer: '대신산업', project: '성남 오피스 리모델링', details: '내부 칸막이 설치', amount: '13,000,000', created: '2026-01-30', updated: '2026-02-03' },
    { id: '2026-0013', customer: '성진토건', project: '분당 아파트 보수', details: '발코니 방수', amount: '7,400,000', created: '2026-01-25', updated: '2026-01-29' },
    { id: '2026-0014', customer: '동양건설', project: '광주 상가 리모델링', details: '외부 간판 및 조명', amount: '6,200,000', created: '2026-01-20', updated: '2026-01-24' },
    { id: '2026-0015', customer: '한솔기업', project: '의정부 주택 신축', details: '기초 공사', amount: '19,000,000', created: '2026-01-15', updated: '2026-01-19' },
    { id: '2026-0016', customer: '대림건설', project: '퇴계원 공장 리모델링', details: '배관 및 설비 교체', amount: '16,300,000', created: '2026-01-12', updated: '2026-01-16' },
    { id: '2026-0017', customer: '태성건축', project: '청주 오피스 보수', details: '전기 및 설비', amount: '10,900,000', created: '2026-01-08', updated: '2026-01-12' },
    { id: '2026-0018', customer: '금강개발', project: '대전 상가 신축', details: '내부 마감', amount: '23,500,000', created: '2026-01-05', updated: '2026-01-09' },
    { id: '2026-0019', customer: '신화건설', project: '광명 아파트 외벽 보수', details: '방수 및 단열', amount: '12,700,000', created: '2025-12-28', updated: '2026-01-02' },
    { id: '2026-0020', customer: '정운산업', project: '수원 오피스 리모델링', details: '데크 및 입구 공사', amount: '14,800,000', created: '2025-12-20', updated: '2025-12-24' }
  ];

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
