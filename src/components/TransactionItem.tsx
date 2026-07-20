import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Transaction } from "../modules/transactions/types";
import { formatCurrency, formatDate } from "../utils";

interface Props {
  transaction: Transaction;
  isLast?: boolean;
}

export function TransactionItem({ transaction, isLast = false }: Props) {
  const isDebt = transaction.type === "debt";
  const color = isDebt ? "#F4511E" : "#159447";
  const backgroundColor = isDebt ? "#FFF0E8" : "#E7F8ED";

  return (
    <View
      style={[
        styles.row,
        isDebt && styles.debtRow,
        !isLast && styles.rowBorder,
      ]}
    >
      <View style={[styles.icon, { backgroundColor }]}>
        <Ionicons
          name={isDebt ? "arrow-down" : "arrow-up"}
          size={19}
          color={color}
        />
      </View>

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {isDebt ? "Qarz berildi" : "To'lov qabul qilindi"}
        </Text>
        <Text style={styles.note} numberOfLines={1}>
          {transaction.note || (isDebt ? "Nasiya berildi" : "To'lov olindi")}
        </Text>
      </View>

      <View style={styles.amountBlock}>
        <Text
          selectable
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.72}
          style={[styles.amount, { color }]}
        >
          {isDebt ? "−" : "+"} {formatCurrency(transaction.amount)}
        </Text>
        <Text selectable style={styles.date}>
          {formatDate(transaction.date)}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={17} color="#8B98AB" />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
  },
  debtRow: {
    backgroundColor: "#FFFBF8",
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#E2E9F2",
  },
  icon: {
    width: 36,
    height: 36,
    flexShrink: 0,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    minWidth: 0,
    flex: 1,
    gap: 2,
  },
  title: {
    color: "#071426",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
  },
  note: {
    color: "#5B6F8F",
    fontSize: 10,
    lineHeight: 14,
  },
  amountBlock: {
    maxWidth: 110,
    alignItems: "flex-end",
    gap: 2,
  },
  amount: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  date: {
    color: "#5B6F8F",
    fontSize: 9,
    lineHeight: 13,
    fontVariant: ["tabular-nums"],
  },
});
