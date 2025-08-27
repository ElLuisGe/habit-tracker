// app.js - VERSIÓN COMPLETA con todas las features
const firebaseConfig = {
  apiKey: "AIzaSyB29pr3NH31ORJs92N0y6POCf3qGJxVJ9c",
  authDomain: "habit-tracker-final-3dad5.firebaseapp.com",
  projectId: "habit-tracker-final-3dad5",
  storageBucket: "habit-tracker-final-3dad5.firebasestorage.app",
  messagingSenderId: "373459383949",
  appId: "1:373459383949:web:487cc97882b063735254c4",
  measurementId: "G-9Q4JG5RMHX"
};

class HabitTracker {
    constructor() {
        this.habits = JSON.parse(localStorage.getItem('habits')) || [];
        this.currentDate = new Date().toLocaleDateString('es-ES');
        this.currentMonth = new Date().getMonth();
        this.currentYear = new Date().getFullYear();
        this.charts = {};
        
        this.init();
    }

    init() {
        this.renderHabits();
        this.renderFullCalendar();
        this.setupEventListeners();
        this.initCharts();
        console.log('✅ Habit Tracker PRO iniciado');
    }

    setupEventListeners() {
        // Añadir hábito
        document.getElementById('addBtn').addEventListener('click', () => {
            this.addHabit();
        });

        // Enter para añadir
        document.getElementById('habitInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addHabit();
            }
        });

        // Borrar todos los datos
        document.getElementById('clearData').addEventListener('click', () => {
            this.clearAllData();
        });

        // Exportar datos
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportData();
        });

        // Importar datos
        document.getElementById('importBtn').addEventListener('click', () => {
            document.getElementById('importFile').click();
        });

        document.getElementById('importFile').addEventListener('change', (e) => {
            this.importData(e);
        });

        // Tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.showTab(e.target.dataset.tab);
            });
        });

        // Navegación del calendario
        document.getElementById('prevMonth').addEventListener('click', () => {
            this.changeMonth(-1);
        });

        document.getElementById('nextMonth').addEventListener('click', () => {
            this.changeMonth(1);
        });
    }

    showTab(tabName) {
        // Ocultar todos los tabs
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // Mostrar tab seleccionado
        document.getElementById(tabName + 'Tab').classList.add('active');
        document.querySelector(`.tab-btn[data-tab="${tabName}"]`).classList.add('active');

        // Actualizar gráficos si es necesario
        if (tabName === 'charts') {
            setTimeout(() => this.updateCharts(), 100);
        }
    }

    addHabit() {
        const input = document.getElementById('habitInput');
        const name = input.value.trim();
        const category = document.getElementById('habitCategory').value;

        if (name) {
            const habit = {
                id: Date.now(),
                name: name,
                category: category,
                completedDates: [],
                createdAt: new Date().toISOString(),
                streak: 0,
                totalCompletions: 0
            };

            this.habits.push(habit);
            this.saveHabits();
            this.renderHabits();
            this.updateCharts();
            input.value = '';
            input.focus();
            
            this.showNotification(`"${name}" añadido correctamente`);
        }
    }

    toggleHabit(habitId) {
        const habit = this.habits.find(h => h.id === habitId);
        if (!habit) return;

        const index = habit.completedDates.indexOf(this.currentDate);
        
        if (index === -1) {
            habit.completedDates.push(this.currentDate);
            habit.totalCompletions++;
        } else {
            habit.completedDates.splice(index, 1);
            habit.totalCompletions--;
        }

        this.updateStreak(habit);
        this.saveHabits();
        this.renderHabits();
        this.renderFullCalendar();
        this.updateCharts();
        
        const action = index === -1 ? 'completado' : 'pendiente';
        this.showNotification(`Hábito ${action} para hoy`);
    }

    updateStreak(habit) {
        if (habit.completedDates.length === 0) {
            habit.streak = 0;
            return;
        }

        const dates = [...habit.completedDates].sort();
        let maxStreak = 0;
        let currentStreak = 0;

        for (let i = 1; i < dates.length; i++) {
            const prevDate = new Date(dates[i - 1]);
            const currDate = new Date(dates[i]);
            const diffDays = Math.ceil((currDate - prevDate) / (1000 * 60 * 60 * 24));
            
            if (diffDays === 1) {
                currentStreak++;
            } else if (diffDays > 1) {
                maxStreak = Math.max(maxStreak, currentStreak);
                currentStreak = 0;
            }
        }

        habit.streak = Math.max(maxStreak, currentStreak);
    }

    deleteHabit(habitId) {
        const habitIndex = this.habits.findIndex(h => h.id === habitId);
        
        if (habitIndex !== -1) {
            const habitName = this.habits[habitIndex].name;
            
            if (confirm(`¿Estás seguro de eliminar "${habitName}"?`)) {
                this.habits.splice(habitIndex, 1);
                this.saveHabits();
                this.renderHabits();
                this.updateCharts();
                this.showNotification(`"${habitName}" eliminado`);
            }
        }
    }

    renderHabits() {
        const habitsList = document.getElementById('habitsList');
        habitsList.innerHTML = '';

        if (this.habits.length === 0) {
            habitsList.innerHTML = `
                <div class="empty-state">
                    <div class="icon">📝</div>
                    <h3>No hay hábitos aún</h3>
                    <p>Añade tu primer hábito para comenzar</p>
                </div>
            `;
            this.updateStats();
            return;
        }

        this.habits.forEach(habit => {
            const isCompleted = habit.completedDates.includes(this.currentDate);
            const completionRate = this.calculateCompletionRate(habit);
            
            const habitElement = document.createElement('div');
            habitElement.className = `habit-item ${isCompleted ? 'completed' : ''}`;
            habitElement.innerHTML = `
                <input type="checkbox" class="habit-check" ${isCompleted ? 'checked' : ''} 
                    onchange="app.toggleHabit(${habit.id})">
                <div class="habit-content">
                    <div class="habit-name">${habit.name}</div>
                    <div class="habit-details">
                        <span class="habit-category">${this.getCategoryName(habit.category)}</span>
                        <span class="habit-streak">🔥 ${habit.streak} días</span>
                        <span class="habit-completion">${completionRate}% completado</span>
                    </div>
                </div>
                <button class="btn-delete" onclick="app.deleteHabit(${habit.id})">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            
            habitsList.appendChild(habitElement);
        });

        this.updateStats();
    }

    calculateCompletionRate(habit) {
        const createdDate = new Date(habit.createdAt);
        const today = new Date();
        const daysSinceCreation = Math.ceil((today - createdDate) / (1000 * 60 * 60 * 24));
        
        if (daysSinceCreation <= 0) return 0;
        
        const completionRate = (habit.totalCompletions / daysSinceCreation) * 100;
        return Math.min(Math.round(completionRate), 100);
    }

    updateStats() {
        const completedToday = this.habits.filter(habit => 
            habit.completedDates.includes(this.currentDate)
        ).length;

        const totalHabits = this.habits.length;
        const longestStreak = this.habits.length > 0 ? 
            Math.max(...this.habits.map(habit => habit.streak)) : 0;
        
        const productivityScore = totalHabits > 0 ? 
            Math.round((completedToday / totalHabits) * 100) : 0;

        document.getElementById('todayCount').textContent = `${completedToday}/${totalHabits}`;
        document.getElementById('totalCount').textContent = totalHabits;
        document.getElementById('streakCount').textContent = `${longestStreak} días`;
        document.getElementById('productivityScore').textContent = `${productivityScore}%`;
    }

    // ===== CALENDARIO COMPLETO =====
    renderFullCalendar() {
        const calendar = document.getElementById('fullCalendar');
        calendar.innerHTML = '';

        // Encabezados de días
        const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
        days.forEach(day => {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-header';
            dayElement.textContent = day;
            calendar.appendChild(dayElement);
        });

        // Obtener primer día del mes y último día
        const firstDay = new Date(this.currentYear, this.currentMonth, 1);
        const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
        
        // Días vacíos al inicio
        const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
        for (let i = 0; i < startDay; i++) {
            calendar.appendChild(this.createCalendarDay('empty'));
        }

        // Días del mes
        for (let day = 1; day <= lastDay.getDate(); day++) {
            const dateStr = `${this.currentYear}-${String(this.currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            calendar.appendChild(this.createCalendarDay('normal', day, dateStr));
        }

        // Actualizar mes actual
        const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                           'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        document.getElementById('currentMonth').textContent = 
            `${monthNames[this.currentMonth]} ${this.currentYear}`;
    }

    createCalendarDay(type, day = null, dateStr = null) {
        const dayElement = document.createElement('div');
        
        if (type === 'empty') {
            dayElement.className = 'calendar-day-full empty';
            return dayElement;
        }

        const isToday = dateStr === this.currentDate;
        const isCompleted = this.habits.some(habit => 
            habit.completedDates.includes(dateStr)
        );

        const completedHabits = this.habits.filter(habit => 
            habit.completedDates.includes(dateStr)
        ).length;

        dayElement.className = `calendar-day-full ${isCompleted ? 'completed' : ''} ${isToday ? 'today' : ''}`;
        dayElement.innerHTML = `
            <div class="calendar-day-number">${day}</div>
            ${completedHabits > 0 ? `
                <div class="calendar-day-dots">
                    ${'<div class="day-dot"></div>'.repeat(Math.min(completedHabits, 5))}
                </div>
            ` : ''}
        `;

        return dayElement;
    }

    changeMonth(delta) {
        this.currentMonth += delta;
        
        if (this.currentMonth < 0) {
            this.currentMonth = 11;
            this.currentYear--;
        } else if (this.currentMonth > 11) {
            this.currentMonth = 0;
            this.currentYear++;
        }
        
        this.renderFullCalendar();
    }

    // ===== GRÁFICOS =====
    initCharts() {
        this.createWeeklyChart();
        this.createMonthlyChart();
        this.createCategoryChart();
    }

    createWeeklyChart() {
        const ctx = document.getElementById('weeklyChart').getContext('2d');
        const data = this.getWeeklyProductivity();
        
        this.charts.weekly = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
                datasets: [{
                    label: 'Hábitos completados',
                    data: data,
                    backgroundColor: 'rgba(102, 126, 234, 0.8)',
                    borderColor: 'rgba(102, 126, 234, 1)',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Hábitos completados'
                        }
                    }
                }
            }
        });
    }

    getWeeklyProductivity() {
        const weekDays = [0, 0, 0, 0, 0, 0, 0];
        
        this.habits.forEach(habit => {
            habit.completedDates.forEach(date => {
                const dayOfWeek = new Date(date).getDay();
                const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                weekDays[adjustedDay]++;
            });
        });

        return weekDays;
    }

    createMonthlyChart() {
        const ctx = document.getElementById('monthlyChart').getContext('2d');
        const data = this.getMonthlyProductivity();
        
        this.charts.monthly = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array.from({length: data.length}, (_, i) => i + 1),
                datasets: [{
                    label: 'Hábitos por día',
                    data: data,
                    fill: true,
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Hábitos completados'
                        }
                    }
                }
            }
        });
    }

    getMonthlyProductivity() {
        const currentMonth = new Date().getMonth();
        const daysInMonth = new Date(new Date().getFullYear(), currentMonth + 1, 0).getDate();
        const dailyCount = new Array(daysInMonth).fill(0);

        this.habits.forEach(habit => {
            habit.completedDates.forEach(date => {
                const dateObj = new Date(date);
                if (dateObj.getMonth() === currentMonth) {
                    const day = dateObj.getDate() - 1;
                    dailyCount[day]++;
                }
            });
        });

        return dailyCount;
    }

    createCategoryChart() {
        const ctx = document.getElementById('categoryChart').getContext('2d');
        const data = this.getCategoryDistribution();
        
        this.charts.category = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(data).map(key => this.getCategoryName(key)),
                datasets: [{
                    data: Object.values(data),
                    backgroundColor: [
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    getCategoryDistribution() {
        const categories = {};
        this.habits.forEach(habit => {
            categories[habit.category] = (categories[habit.category] || 0) + 1;
        });
        return categories;
    }

    updateCharts() {
        if (this.charts.weekly) {
            this.charts.weekly.data.datasets[0].data = this.getWeeklyProductivity();
            this.charts.weekly.update();
        }
        if (this.charts.monthly) {
            this.charts.monthly.data.datasets[0].data = this.getMonthlyProductivity();
            this.charts.monthly.update();
        }
        if (this.charts.category) {
            this.charts.category.data.datasets[0].data = Object.values(this.getCategoryDistribution());
            this.charts.category.update();
        }
    }

    // ===== IMPORT/EXPORT =====
    exportData() {
        const data = {
            habits: this.habits,
            exportedAt: new Date().toISOString(),
            version: '1.0'
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `habit-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        
        this.showNotification('Datos exportados correctamente');
    }

    importData(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                if (data.habits && Array.isArray(data.habits)) {
                    this.habits = data.habits;
                    this.saveHabits();
                    this.renderHabits();
                    this.renderFullCalendar();
                    this.updateCharts();
                    this.showNotification('Datos importados correctamente');
                } else {
                    throw new Error('Formato de archivo inválido');
                }
            } catch (error) {
                console.error('Error importing data:', error);
                alert('Error al importar: Formato de archivo inválido');
            }
        };
        reader.readAsText(file);
        
        // Reset input
        event.target.value = '';
    }

    // ===== UTILITIES =====
    getCategoryName(category) {
        const categories = {
            'salud': '🏥 Salud',
            'deporte': '⚽ Deporte',
            'estudio': '📚 Estudio',
            'trabajo': '💼 Trabajo',
            'personal': '🌟 Personal'
        };
        return categories[category] || category;
    }

    clearAllData() {
        if (confirm('¿Estás seguro de borrar TODOS los datos? Esto no se puede deshacer.')) {
            this.habits = [];
            this.saveHabits();
            this.renderHabits();
            this.renderFullCalendar();
            this.updateCharts();
            this.showNotification('Todos los datos han sido borrados');
        }
    }

    saveHabits() {
        localStorage.setItem('habits', JSON.stringify(this.habits));
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 3000);
    }
}

// Inicializar la aplicación
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new HabitTracker();
});