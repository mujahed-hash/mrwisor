import User from './user';
import Group from './group';
import Expense from './expense';
import Payment from './payment';
import GroupMember from './groupMember';
import ExpenseSplit from './expenseSplit';
import Notification from './notification';
import Comment from './comment';
import SystemSetting from './systemSetting';
import Ad from './ad';
import PurchaseItem from './purchaseItem';
import DeviceToken from './deviceToken';
import sequelize from '../config/database';

// User and Group (Many-to-Many)
User.belongsToMany(Group, { through: GroupMember, foreignKey: 'userId', as: 'groups' });
Group.belongsToMany(User, { through: GroupMember, foreignKey: 'groupId', as: 'users' });

// Direct associations for GroupMember (needed for eager loading)
Group.hasMany(GroupMember, { foreignKey: 'groupId', as: 'members' });
GroupMember.belongsTo(Group, { foreignKey: 'groupId' });
User.hasMany(GroupMember, { foreignKey: 'userId', as: 'memberships' });
GroupMember.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User and Notification (One-to-Many)
User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications', onDelete: 'CASCADE' });
Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User and Comment (One-to-Many)
User.hasMany(Comment, { foreignKey: 'userId', as: 'comments', onDelete: 'CASCADE' });
Comment.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Expense and Comment (One-to-Many)
Expense.hasMany(Comment, { foreignKey: 'expenseId', as: 'comments', onDelete: 'CASCADE' });
Comment.belongsTo(Expense, { foreignKey: 'expenseId', as: 'expense' });

// User and Expense (One-to-Many)
User.hasMany(Expense, { foreignKey: 'paidBy', as: 'paidExpenses' }); // Don't cascade user delete to expense usually, but keeping default restrictive/set null is better for financial records. But for Group delete, we need cascade.
Expense.belongsTo(User, { foreignKey: 'paidBy', as: 'payer' });

// Group and Expense (One-to-Many)
Group.hasMany(Expense, { foreignKey: 'groupId', onDelete: 'CASCADE' });
Expense.belongsTo(Group, { foreignKey: 'groupId' });

// Group and Payment (One-to-Many) - Payments linked to a group should be deleted if group is deleted
Group.hasMany(Payment, { foreignKey: 'groupId', onDelete: 'CASCADE' });
Payment.belongsTo(Group, { foreignKey: 'groupId' });

// User and Payment (Payer)
User.hasMany(Payment, { foreignKey: 'payerId', as: 'payerPayments' });
Payment.belongsTo(User, { foreignKey: 'payerId', as: 'payer' });

// User and Payment (Payee)
User.hasMany(Payment, { foreignKey: 'payeeId', as: 'payeePayments' });
Payment.belongsTo(User, { foreignKey: 'payeeId', as: 'payee' });

// Expense and ExpenseSplit (One-to-Many)
Expense.hasMany(ExpenseSplit, { foreignKey: 'expenseId', onDelete: 'CASCADE' });
ExpenseSplit.belongsTo(Expense, { foreignKey: 'expenseId' });

// User and ExpenseSplit (One-to-Many)
User.hasMany(ExpenseSplit, { foreignKey: 'userId' });
ExpenseSplit.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Expense and PurchaseItem (One-to-Many)
Expense.hasMany(PurchaseItem, { foreignKey: 'expenseId', as: 'purchaseItems', onDelete: 'CASCADE' });
PurchaseItem.belongsTo(Expense, { foreignKey: 'expenseId' });

// User and DeviceToken (One-to-Many)
User.hasMany(DeviceToken, { foreignKey: 'userId', as: 'deviceTokens', onDelete: 'CASCADE' });
DeviceToken.belongsTo(User, { foreignKey: 'userId', as: 'user' });

const db = {
  sequelize,
  User,
  Group,
  Expense,
  Payment,
  GroupMember,
  ExpenseSplit,
  Notification,
  Comment,
  SystemSetting,
  Ad,
  PurchaseItem,
  DeviceToken,
};

export default db;
