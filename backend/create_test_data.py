from app import app, db
from models import Election
from datetime import datetime, timedelta

def create_test_elections():
    with app.app_context():
        # Create an active election
        active_election = Election(
            name="Current Election 2024",
            status="active",
            start_date=datetime.now(),
            end_date=datetime.now() + timedelta(days=7)
        )

        # Create a completed election
        completed_election = Election(
            name="Past Election 2023",
            status="completed",
            start_date=datetime.now() - timedelta(days=30),
            end_date=datetime.now() - timedelta(days=23)
        )

        db.session.add(active_election)
        db.session.add(completed_election)
        db.session.commit()

        print("Test elections created successfully!")

if __name__ == "__main__":
    create_test_elections()