"""
Financial Service - Centralized and optimized financial calculations.

This service provides optimized methods for calculating expenses, revenues,
and lot costs across the application. It uses SQL aggregation instead of
Python loops for better performance.
"""

from sqlalchemy.orm import Session
from sqlalchemy import func, or_, case
from decimal import Decimal
from datetime import date
from typing import List, Optional, Dict, Any
from uuid import UUID

from app.models.lot import Lot
from app.models.building import Building
from app.models.site import Site
from app.models.finance import Sale, Expense, PaymentStatus


class FinancialService:
    """Centralized financial calculations with optimized queries."""

    def __init__(self, db: Session):
        self.db = db

    def get_lot_initial_costs(
        self,
        site_ids: Optional[List[UUID]] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        lot_id: Optional[UUID] = None,
        include_lots_without_building: bool = True
    ) -> Decimal:
        """
        Calculate total initial costs for lots using SQL aggregation.

        This is much faster than loading all lots and summing in Python.
        Single query instead of N+1.
        """
        # Build the aggregation query
        # Using COALESCE to handle NULL values, and calculating in SQL
        query = self.db.query(
            func.coalesce(
                func.sum(
                    func.coalesce(Lot.chick_price_unit * Lot.initial_quantity, 0) +
                    func.coalesce(Lot.transport_cost, 0) +
                    func.coalesce(Lot.other_initial_costs, 0)
                ),
                0
            )
        ).outerjoin(Building).outerjoin(Site)

        # Apply filters
        if lot_id:
            query = query.filter(Lot.id == lot_id)
        elif site_ids:
            if include_lots_without_building:
                query = query.filter(
                    or_(
                        Building.site_id.in_(site_ids),
                        Lot.building_id.is_(None)
                    )
                )
            else:
                query = query.filter(Building.site_id.in_(site_ids))

        if start_date:
            query = query.filter(func.date(Lot.created_at) >= start_date)
        if end_date:
            query = query.filter(func.date(Lot.created_at) <= end_date)

        result = query.scalar()
        return Decimal(str(result or 0))

    def get_lot_initial_costs_breakdown(
        self,
        site_ids: Optional[List[UUID]] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        include_lots_without_building: bool = True
    ) -> Dict[str, Decimal]:
        """
        Get breakdown of lot initial costs by category.
        Returns: {'chicks': X, 'transport': Y, 'other': Z}
        """
        query = self.db.query(
            func.coalesce(func.sum(Lot.chick_price_unit * Lot.initial_quantity), 0).label('chicks'),
            func.coalesce(func.sum(Lot.transport_cost), 0).label('transport'),
            func.coalesce(func.sum(Lot.other_initial_costs), 0).label('other')
        ).outerjoin(Building).outerjoin(Site)

        if site_ids:
            if include_lots_without_building:
                query = query.filter(
                    or_(
                        Building.site_id.in_(site_ids),
                        Lot.building_id.is_(None)
                    )
                )
            else:
                query = query.filter(Building.site_id.in_(site_ids))

        if start_date:
            query = query.filter(func.date(Lot.created_at) >= start_date)
        if end_date:
            query = query.filter(func.date(Lot.created_at) <= end_date)

        result = query.first()
        return {
            'chicks': Decimal(str(result.chicks or 0)),
            'transport': Decimal(str(result.transport or 0)),
            'other': Decimal(str(result.other or 0))
        }

    def get_total_expenses(
        self,
        site_ids: Optional[List[UUID]] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        lot_id: Optional[UUID] = None,
        include_lot_costs: bool = True
    ) -> Decimal:
        """
        Get total expenses including both Expense table and lot initial costs.
        Single optimized calculation.
        """
        # Query expenses from table
        expense_query = self.db.query(
            func.coalesce(func.sum(Expense.amount), 0)
        )

        if lot_id:
            expense_query = expense_query.filter(Expense.lot_id == lot_id)
        elif site_ids:
            expense_query = expense_query.filter(
                or_(
                    Expense.site_id.in_(site_ids),
                    Expense.site_id.is_(None)
                )
            )

        if start_date:
            expense_query = expense_query.filter(Expense.date >= start_date)
        if end_date:
            expense_query = expense_query.filter(Expense.date <= end_date)

        table_expenses = Decimal(str(expense_query.scalar() or 0))

        # Add lot initial costs if requested
        if include_lot_costs:
            lot_costs = self.get_lot_initial_costs(
                site_ids=site_ids,
                start_date=start_date,
                end_date=end_date,
                lot_id=lot_id
            )
            return table_expenses + lot_costs

        return table_expenses

    def get_total_sales(
        self,
        site_ids: Optional[List[UUID]] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        lot_id: Optional[UUID] = None
    ) -> Decimal:
        """Get total sales."""
        query = self.db.query(
            func.coalesce(func.sum(Sale.total_amount), 0)
        )

        if lot_id:
            query = query.filter(Sale.lot_id == lot_id)
        elif site_ids:
            query = query.filter(
                or_(
                    Sale.site_id.in_(site_ids),
                    Sale.site_id.is_(None)
                )
            )

        if start_date:
            query = query.filter(Sale.date >= start_date)
        if end_date:
            query = query.filter(Sale.date <= end_date)

        return Decimal(str(query.scalar() or 0))

    def get_financial_summary(
        self,
        site_ids: Optional[List[UUID]] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        lot_id: Optional[UUID] = None
    ) -> Dict[str, Any]:
        """
        Get complete financial summary in a single call.
        More efficient than calling multiple methods separately.
        """
        total_sales = self.get_total_sales(site_ids, start_date, end_date, lot_id)
        total_expenses = self.get_total_expenses(site_ids, start_date, end_date, lot_id)
        lot_costs_breakdown = self.get_lot_initial_costs_breakdown(
            site_ids, start_date, end_date
        )

        margin = total_sales - total_expenses
        margin_percent = (margin / total_sales * 100) if total_sales > 0 else Decimal(0)

        return {
            'total_sales': float(round(total_sales, 2)),
            'total_expenses': float(round(total_expenses, 2)),
            'margin': float(round(margin, 2)),
            'margin_percent': float(round(margin_percent, 2)),
            'lot_costs_breakdown': {
                'chicks': float(round(lot_costs_breakdown['chicks'], 2)),
                'transport': float(round(lot_costs_breakdown['transport'], 2)),
                'other': float(round(lot_costs_breakdown['other'], 2))
            }
        }

    def get_expenses_by_category(
        self,
        site_ids: Optional[List[UUID]] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        include_lot_costs: bool = True
    ) -> Dict[str, float]:
        """
        Get expenses grouped by category using SQL aggregation.
        """
        # Query expenses by category
        query = self.db.query(
            Expense.category,
            func.sum(Expense.amount).label('total')
        )

        if site_ids:
            query = query.filter(
                or_(
                    Expense.site_id.in_(site_ids),
                    Expense.site_id.is_(None)
                )
            )

        if start_date:
            query = query.filter(Expense.date >= start_date)
        if end_date:
            query = query.filter(Expense.date <= end_date)

        query = query.group_by(Expense.category)

        categories = {}
        for row in query.all():
            cat = row.category or 'other'
            categories[cat] = float(round(Decimal(str(row.total or 0)), 2))

        # Add lot costs if requested
        if include_lot_costs:
            lot_breakdown = self.get_lot_initial_costs_breakdown(
                site_ids, start_date, end_date
            )
            if lot_breakdown['chicks'] > 0:
                categories['chicks'] = categories.get('chicks', 0) + float(round(lot_breakdown['chicks'], 2))
            if lot_breakdown['transport'] > 0:
                categories['transport'] = categories.get('transport', 0) + float(round(lot_breakdown['transport'], 2))
            if lot_breakdown['other'] > 0:
                categories['other'] = categories.get('other', 0) + float(round(lot_breakdown['other'], 2))

        return categories


    def get_monthly_financial_data(
        self,
        site_ids: Optional[List[UUID]] = None,
        months: int = 6,
        include_lot_costs: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Get monthly sales and expenses data for charts.
        Uses SQL aggregation for efficiency.
        """
        from datetime import date, timedelta

        results = []
        today = date.today()

        for i in range(months - 1, -1, -1):
            # Calculate month start/end
            month_start = date(today.year, today.month, 1) - timedelta(days=i * 30)
            month_start = date(month_start.year, month_start.month, 1)
            if month_start.month == 12:
                month_end = date(month_start.year + 1, 1, 1) - timedelta(days=1)
            else:
                month_end = date(month_start.year, month_start.month + 1, 1) - timedelta(days=1)

            # Get sales and expenses for this month
            sales = self.get_total_sales(site_ids, month_start, month_end)
            expenses = self.get_total_expenses(
                site_ids, month_start, month_end,
                include_lot_costs=include_lot_costs
            )

            results.append({
                "month": month_start.strftime("%b %Y"),
                "month_short": month_start.strftime("%b"),
                "sales": float(round(sales, 2)),
                "expenses": float(round(expenses, 2)),
                "margin": float(round(sales - expenses, 2))
            })

        return results

    def get_site_financial_summary(
        self,
        site_id: UUID,
        lot_ids: List[UUID],
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> Dict[str, Decimal]:
        """
        Get financial summary for a specific site.
        Includes expenses/sales linked to the site OR to lots in that site.
        """
        # Sales for this site or its lots
        sales_query = self.db.query(
            func.coalesce(func.sum(Sale.total_amount), 0)
        )
        if lot_ids:
            sales_query = sales_query.filter(
                or_(Sale.site_id == site_id, Sale.lot_id.in_(lot_ids))
            )
        else:
            sales_query = sales_query.filter(Sale.site_id == site_id)

        if start_date:
            sales_query = sales_query.filter(Sale.date >= start_date)
        if end_date:
            sales_query = sales_query.filter(Sale.date <= end_date)

        total_sales = Decimal(str(sales_query.scalar() or 0))

        # Expenses for this site or its lots
        expenses_query = self.db.query(
            func.coalesce(func.sum(Expense.amount), 0)
        )
        if lot_ids:
            expenses_query = expenses_query.filter(
                or_(Expense.site_id == site_id, Expense.lot_id.in_(lot_ids))
            )
        else:
            expenses_query = expenses_query.filter(Expense.site_id == site_id)

        if start_date:
            expenses_query = expenses_query.filter(Expense.date >= start_date)
        if end_date:
            expenses_query = expenses_query.filter(Expense.date <= end_date)

        expenses_table = Decimal(str(expenses_query.scalar() or 0))

        # Lot initial costs - optimized with SQL aggregation
        lot_costs_query = self.db.query(
            func.coalesce(
                func.sum(
                    func.coalesce(Lot.chick_price_unit * Lot.initial_quantity, 0) +
                    func.coalesce(Lot.transport_cost, 0) +
                    func.coalesce(Lot.other_initial_costs, 0)
                ),
                0
            )
        ).join(Building).filter(Building.site_id == site_id)

        if start_date:
            lot_costs_query = lot_costs_query.filter(func.date(Lot.created_at) >= start_date)
        if end_date:
            lot_costs_query = lot_costs_query.filter(func.date(Lot.created_at) <= end_date)

        lot_initial_costs = Decimal(str(lot_costs_query.scalar() or 0))
        total_expenses = expenses_table + lot_initial_costs

        return {
            'total_sales': total_sales,
            'total_expenses': total_expenses,
            'gross_margin': total_sales - total_expenses
        }

    def get_pending_receivables(
        self,
        site_ids: Optional[List[UUID]] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> Decimal:
        """Get total pending receivables (unpaid sales)."""
        query = self.db.query(
            func.coalesce(
                func.sum(Sale.total_amount - Sale.amount_paid),
                0
            )
        ).filter(
            Sale.payment_status.in_([PaymentStatus.PENDING, PaymentStatus.PARTIAL])
        )

        if site_ids:
            query = query.filter(
                or_(
                    Sale.site_id.in_(site_ids),
                    Sale.site_id.is_(None)
                )
            )

        if start_date:
            query = query.filter(Sale.date >= start_date)
        if end_date:
            query = query.filter(Sale.date <= end_date)

        return Decimal(str(query.scalar() or 0))


# Convenience function for quick access
def get_financial_service(db: Session) -> FinancialService:
    """Factory function to create a FinancialService instance."""
    return FinancialService(db)
