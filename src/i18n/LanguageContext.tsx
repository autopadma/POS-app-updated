import React, { createContext, useContext, useState, ReactNode } from 'react';

export type Language = 'en' | 'bn';

export const translations = {
  en: {
    appTitle: 'Ryan Enterprise',
    appAddress: 'Badurtola, Chattogram',
    pos: 'POS',
    inventory: 'Inventory',
    reports: 'Reports',
    
    // Inventory
    addProduct: 'Add Product',
    editProduct: 'Edit Product',
    updateProduct: 'Update Product',
    barcode: 'Barcode',
    name: 'Name',
    buyPrice: 'Buy Price',
    sellPrice: 'Sell Price',
    stock: 'Stock',
    actions: 'Actions',
    save: 'Save',
    cancel: 'Cancel',
    searchProducts: 'Search products...',
    noProducts: 'No products found.',
    
    // POS
    scanBarcode: 'Scan Barcode',
    cartEmpty: 'Cart is empty',
    subtotal: 'Subtotal',
    discount: 'Discount',
    serviceCharge: 'Service Charge',
    total: 'Total',
    checkoutPrint: 'Checkout & Print Receipt',
    receiptPreview: 'Receipt Preview',
    printReceipt: 'Print Receipt',
    close: 'Close',
    added: 'Added',
    productNotFound: 'Product not found!',
    saleCompleted: 'Sale completed successfully!',
    checkoutFailed: 'Checkout failed. Please try again.',
    preparingReceipt: 'Preparing receipt for printing...',
    receiptPrinted: 'Receipt printed successfully!',
    printFailed: 'Failed to print receipt. If you are in the preview, try opening the app in a new tab.',
    newCart: 'New Cart',
    cart: 'Cart',
    customerName: 'Customer Name',
    customerPhone: 'Customer Phone',
    
    // Reports
    reportsTitle: 'Sales Reports',
    filterByDate: 'Filter by Date',
    startDate: 'Start Date',
    endDate: 'End Date',
    exportExcel: 'Export to Excel',
    today: 'Today',
    thisWeek: 'This Week',
    thisMonth: 'This Month',
    totalSales: 'Total Sales',
    totalProfit: 'Total Profit',
    totalServiceCharge: 'Total Service Charge',
    exportCSV: 'Export CSV',
    date: 'Date',
    items: 'Items',
    buy: 'Buy',
    sell: 'Sell',
    profit: 'Profit',
    reportsLocked: 'Reports Locked',
    enterPin: 'Enter PIN',
    submit: 'Submit',
    incorrectPin: 'Incorrect PIN. Please try again.',
    
    // Receipt
    receiptTitle: 'Ryan Enterprise',
    receiptAddress: 'Badurtola, Chattogram',
    receiptDate: 'Date',
    receiptItem: 'Item',
    receiptQty: 'Qty',
    receiptAmt: 'Amt',
    receiptSubtotal: 'Subtotal',
    receiptDiscount: 'Discount',
    receiptTotal: 'TOTAL',
    receiptThanks: 'Thank you for your purchase!',
    receiptVisit: 'Please visit again.',
  },
  bn: {
    appTitle: 'রায়ান এন্টারপ্রাইজ',
    appAddress: 'বাদুরতলা, চট্টগ্রাম',
    pos: 'বিক্রয় (POS)',
    inventory: 'ইনভেন্টরি',
    reports: 'রিপোর্ট',
    
    // Inventory
    addProduct: 'পণ্য যোগ করুন',
    editProduct: 'পণ্য সম্পাদনা করুন',
    updateProduct: 'পণ্য আপডেট করুন',
    barcode: 'বারকোড',
    name: 'নাম',
    buyPrice: 'ক্রয় মূল্য',
    sellPrice: 'বিক্রয় মূল্য',
    stock: 'স্টক',
    actions: 'অ্যাকশন',
    save: 'সংরক্ষণ করুন',
    cancel: 'বাতিল করুন',
    searchProducts: 'পণ্য খুঁজুন...',
    noProducts: 'কোনো পণ্য পাওয়া যায়নি।',
    
    // POS
    scanBarcode: 'বারকোড স্ক্যান করুন',
    cartEmpty: 'কার্ট খালি',
    subtotal: 'সাবটোটাল',
    discount: 'ডিসকাউন্ট',
    serviceCharge: 'সার্ভিস চার্জ',
    total: 'মোট',
    checkoutPrint: 'চেকআউট এবং রসিদ প্রিন্ট',
    receiptPreview: 'রসিদ প্রিভিউ',
    printReceipt: 'রসিদ প্রিন্ট করুন',
    close: 'বন্ধ করুন',
    added: 'যোগ করা হয়েছে',
    productNotFound: 'পণ্য পাওয়া যায়নি!',
    saleCompleted: 'বিক্রয় সফলভাবে সম্পন্ন হয়েছে!',
    checkoutFailed: 'চেকআউট ব্যর্থ হয়েছে। আবার চেষ্টা করুন।',
    preparingReceipt: 'প্রিন্ট করার জন্য রসিদ প্রস্তুত করা হচ্ছে...',
    receiptPrinted: 'রসিদ সফলভাবে প্রিন্ট হয়েছে!',
    printFailed: 'রসিদ প্রিন্ট করতে ব্যর্থ। প্রিভিউতে থাকলে নতুন ট্যাবে খোলার চেষ্টা করুন।',
    newCart: 'নতুন কার্ট',
    cart: 'কার্ট',
    customerName: 'গ্রাহকের নাম',
    customerPhone: 'গ্রাহকের ফোন',
    
    // Reports
    reportsTitle: 'বিক্রয় রিপোর্ট',
    filterByDate: 'তারিখ অনুযায়ী ফিল্টার করুন',
    startDate: 'শুরুর তারিখ',
    endDate: 'শেষের তারিখ',
    exportExcel: 'এক্সেলে এক্সপোর্ট করুন',
    today: 'আজ',
    thisWeek: 'এই সপ্তাহ',
    thisMonth: 'এই মাস',
    totalSales: 'মোট বিক্রি',
    totalProfit: 'মোট লাভ',
    totalServiceCharge: 'মোট সার্ভিস চার্জ',
    exportCSV: 'CSV এক্সপোর্ট',
    date: 'তারিখ',
    items: 'আইটেম',
    buy: 'ক্রয়',
    sell: 'বিক্রয়',
    profit: 'লাভ',
    reportsLocked: 'রিপোর্ট লক করা আছে',
    enterPin: 'পিন দিন',
    submit: 'জমা দিন',
    incorrectPin: 'ভুল পিন। আবার চেষ্টা করুন।',
    
    // Receipt
    receiptTitle: 'রায়ান এন্টারপ্রাইজ',
    receiptAddress: 'বাদুরতলা, চট্টগ্রাম',
    receiptDate: 'তারিখ',
    receiptItem: 'আইটেম',
    receiptQty: 'পরিমাণ',
    receiptAmt: 'মূল্য',
    receiptSubtotal: 'সাবটোটাল',
    receiptDiscount: 'ডিসকাউন্ট',
    receiptTotal: 'মোট',
    receiptThanks: 'আপনার ক্রয়ের জন্য ধন্যবাদ!',
    receiptVisit: 'আবার আসবেন।',
  }
};

export type TranslationKey = keyof typeof translations.en;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: TranslationKey): string => {
    return translations[language][key] || translations.en[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
