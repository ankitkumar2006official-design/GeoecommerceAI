import pandas as pd
from itertools import combinations
from typing import Dict, Any, List

class AprioriEngine:
    def __init__(self, min_support: float = 0.015, min_confidence: float = 0.20):
        self.min_support = min_support
        self.min_confidence = min_confidence

    def mine_bundles(self, sales_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Mines frequent itemsets and association rules using Apriori algorithm
        from customer order baskets.
        """
        if not sales_data:
            return {"rules": [], "frequent_itemsets": [], "regional_bundles": []}

        df = pd.DataFrame(sales_data)
        
        # Standardize order and product keys
        order_col = "Order ID" if "Order ID" in df.columns else "order_id"
        prod_col = "Product Name" if "Product Name" in df.columns else "product_name"
        state_col = "State" if "State" in df.columns else "state"

        if order_col not in df.columns or prod_col not in df.columns:
            return {"rules": [], "frequent_itemsets": [], "regional_bundles": []}

        # Build order baskets
        baskets = df.groupby(order_col)[prod_col].apply(lambda s: sorted(list(set(s)))).tolist()
        total_transactions = len(baskets)
        
        if total_transactions < 5:
            return {"rules": [], "frequent_itemsets": [], "regional_bundles": []}

        # Step 1: 1-itemsets support count
        item_counts = {}
        for basket in baskets:
            for item in basket:
                item_counts[item] = item_counts.get(item, 0) + 1

        frequent_1 = {
            item: count / total_transactions
            for item, count in item_counts.items()
            if (count / total_transactions) >= self.min_support
        }

        # Step 2: 2-itemsets candidate generation
        pair_counts = {}
        for basket in baskets:
            # Filter basket to frequent items only
            valid_items = [it for it in basket if it in frequent_1]
            for combo in combinations(sorted(valid_items), 2):
                pair_counts[combo] = pair_counts.get(combo, 0) + 1

        # Association rules: A -> B and B -> A
        rules = []
        for (item_a, item_b), count in pair_counts.items():
            pair_support = count / total_transactions
            if pair_support >= self.min_support:
                supp_a = frequent_1.get(item_a, 0.001)
                supp_b = frequent_1.get(item_b, 0.001)

                # Rule 1: A -> B
                conf_a_b = pair_support / supp_a
                lift_a_b = conf_a_b / supp_b
                
                # Rule 2: B -> A
                conf_b_a = pair_support / supp_b
                lift_b_a = conf_b_a / supp_a

                if conf_a_b >= self.min_confidence:
                    rules.append({
                        "antecedent": item_a,
                        "consequent": item_b,
                        "support": round(pair_support, 4),
                        "confidence": round(conf_a_b, 4),
                        "lift": round(lift_a_b, 3),
                        "recommendation": f"Customers buying '{item_a}' are {round(lift_a_b, 1)}x more likely to also purchase '{item_b}'. Recommend bundling at checkout."
                    })

                if conf_b_a >= self.min_confidence:
                    rules.append({
                        "antecedent": item_b,
                        "consequent": item_a,
                        "support": round(pair_support, 4),
                        "confidence": round(conf_b_a, 4),
                        "lift": round(lift_b_a, 3),
                        "recommendation": f"Customers buying '{item_b}' are {round(lift_b_a, 1)}x more likely to also purchase '{item_a}'. Recommend bundling at checkout."
                    })

        # Sort rules descending by lift
        rules.sort(key=lambda r: (r["lift"], r["confidence"]), reverse=True)

        # Regional bundle trends
        regional_bundles = []
        if state_col in df.columns:
            for state_val, state_group in df.groupby(state_col):
                st_baskets = state_group.groupby(order_col)[prod_col].apply(lambda s: sorted(list(set(s)))).tolist()
                st_pairs = {}
                for b in st_baskets:
                    for combo in combinations(b, 2):
                        st_pairs[combo] = st_pairs.get(combo, 0) + 1
                
                if st_pairs:
                    top_combo, c_count = max(st_pairs.items(), key=lambda x: x[1])
                    if c_count >= 2:
                        regional_bundles.append({
                            "state": state_val,
                            "top_bundle": f"{top_combo[0]} + {top_combo[1]}",
                            "frequency": c_count,
                            "cross_sell_tip": f"Top cross-sell pair in {state_val} with {c_count} joint orders."
                        })

        return {
            "rules": rules[:15],
            "total_transactions_analyzed": total_transactions,
            "regional_bundles": regional_bundles[:10]
        }

apriori_engine = AprioriEngine()

