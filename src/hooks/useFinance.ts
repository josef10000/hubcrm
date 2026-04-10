import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Expense, Transaction, TransactionCategory, Budget } from '../types';

export function useFinance(userId: string) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionCategories, setTransactionCategories] = useState<TransactionCategory[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [newExpense, setNewExpense] = useState<Partial<Expense>>({ category: 'Ferramentas' });

  useEffect(() => {
    if (!userId) return;

    const expensesRef = collection(db, 'organizations', userId, 'expenses');
    const unsubExpenses = onSnapshot(expensesRef, (snapshot) => {
      const loaded: Expense[] = [];
      snapshot.forEach((d) => loaded.push(d.data() as Expense));
      setExpenses(loaded.sort((a, b) => b.date - a.date));
    });

    const transactionsRef = collection(db, 'organizations', userId, 'transactions');
    const unsubTransactions = onSnapshot(transactionsRef, (snapshot) => {
      const loaded: Transaction[] = [];
      snapshot.forEach((d) => loaded.push(d.data() as Transaction));
      setTransactions(loaded.sort((a, b) => b.date - a.date));
    });

    const categoriesRef = collection(db, 'organizations', userId, 'transactionCategories');
    const unsubCategories = onSnapshot(categoriesRef, (snapshot) => {
      const loaded: TransactionCategory[] = [];
      snapshot.forEach((d) => loaded.push(d.data() as TransactionCategory));
      setTransactionCategories(loaded);
    });

    const budgetsRef = collection(db, 'organizations', userId, 'budgets');
    const unsubBudgets = onSnapshot(budgetsRef, (snapshot) => {
      const loaded: Budget[] = [];
      snapshot.forEach((d) => loaded.push(d.data() as Budget));
      setBudgets(loaded);
    });

    return () => {
      unsubExpenses();
      unsubTransactions();
      unsubCategories();
      unsubBudgets();
    };
  }, [userId]);

  return {
    expenses, transactions, transactionCategories, budgets,
    newExpense, setNewExpense,
  };
}
