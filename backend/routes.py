from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
import hashlib
import qrcode
import os
from datetime import datetime
from models import db, Client, Voter, VoteValidation, PublicVotes, Election, VotingHistory

routes = Blueprint("routes", __name__)

### ✅ CLIENT REGISTRATION ###
@routes.route("/register_client", methods=["POST"])
def register_client():
    try:
        data = request.json
        if not all(k in data for k in ("name", "email", "organization", "password")):
            return jsonify({"message": "Missing fields"}), 400

        hashed_password = generate_password_hash(data["password"], method="pbkdf2:sha256")
        
        client = Client(
            name=data["name"], 
            email=data["email"], 
            organization=data["organization"], 
            password=hashed_password
        )
        
        db.session.add(client)
        db.session.commit()
        return jsonify({"message": "Client Registered Successfully!"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

### ✅ CLIENT LOGIN ###
@routes.route("/client_login", methods=["POST"])
def client_login():
    try:
        data = request.json
        client = Client.query.filter_by(email=data["email"]).first()

        if client and check_password_hash(client.password, data["password"]):
            token = create_access_token(identity=str(client.id))
            return jsonify({"token": token, "message": "Login Successful"}), 200
        
        return jsonify({"message": "Invalid Credentials"}), 401
    except Exception as e:
        return jsonify({"error": str(e)}), 500

### ✅ VOTER REGISTRATION ###
@routes.route("/register_voter", methods=["POST"])
def register_voter():
    try:
        data = request.json
        if "gov_ids" not in data:
            return jsonify({"message": "Missing government ID"}), 400

        # Generate unique token from government ID
        gov_id_string = str(data["gov_ids"])
        unique_token = hashlib.sha256(gov_id_string.encode()).hexdigest()

        # Check if voter already exists
        existing_voter = Voter.query.filter_by(gov_ids=gov_id_string).first()
        if existing_voter:
            return jsonify({"message": "Voter already registered"}), 400

        # Create new voter
        voter = Voter(
            first_name=data.get("first_name"),
            last_name=data.get("last_name"),
            email=data.get("email"),
            dob=data.get("dob"),
            address=data.get("address"),
            gov_ids=gov_id_string,
            unique_token=unique_token,
            internal_id=hashlib.sha256((unique_token + "internal").encode()).hexdigest()
        )
        
        db.session.add(voter)
        db.session.commit()

        # Generate QR code
        qr_dir = os.path.join(os.getcwd(), "backend/qrcodes")
        if not os.path.exists(qr_dir):
            os.makedirs(qr_dir)

        qr_path = os.path.join(qr_dir, f"{unique_token}.png")
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(unique_token)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        img.save(qr_path)

        return jsonify({
            "message": "Voter registered successfully",
            "token": unique_token,
            "qr_code": f"/qrcodes/{unique_token}.png"
        }), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500

### ✅ VOTER LOGIN ###
@routes.route("/voter_login", methods=["POST"])
def voter_login():
    try:
        data = request.json
        if "voter_id" not in data:
            return jsonify({"message": "Missing voter ID"}), 400

        voter = Voter.query.filter_by(unique_token=data["voter_id"]).first()
        if not voter:
            return jsonify({"message": "Invalid voter ID"}), 401

        token = create_access_token(identity=voter.internal_id)
        return jsonify({
            "message": "Login successful",
            "token": token
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

### ✅ VOTER DETAILS ###
@routes.route("/voter_details", methods=["GET"])
@jwt_required()
def voter_details():
    try:
        internal_id = get_jwt_identity()
        voter = Voter.query.filter_by(internal_id=internal_id).first()

        if not voter:
            return jsonify({"message": "Voter not found"}), 404

        return jsonify({
            "first_name": voter.first_name,
            "last_name": voter.last_name,
            "email": voter.email,
            "unique_token": voter.unique_token,
            "internal_id": voter.internal_id
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

### ✅ GET ACTIVE ELECTIONS ###
@routes.route("/active_elections", methods=["GET"])
@jwt_required()
def get_active_elections():
    try:
        active_elections = Election.query.filter_by(status="active").all()
        elections_data = []
        
        for election in active_elections:
            # Check if voter has already voted in this election
            internal_id = get_jwt_identity()
            vote_cast = VoteValidation.query.filter_by(
                internal_id=internal_id,
                election_id=election.id
            ).first()
            
            elections_data.append({
                "id": election.id,
                "name": election.name,
                "start_date": election.start_date.isoformat(),
                "end_date": election.end_date.isoformat(),
                "has_voted": bool(vote_cast)
            })
            
        return jsonify(elections_data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

### ✅ GET VOTING HISTORY ###
@routes.route("/voting_history", methods=["GET"])
@jwt_required()
def get_voting_history():
    try:
        internal_id = get_jwt_identity()
        voting_history = VotingHistory.query.filter_by(voter_internal_id=internal_id).all()
        
        history_data = []
        for history in voting_history:
            election = Election.query.get(history.election_id)
            history_data.append({
                "election_name": election.name,
                "election_date": election.end_date.isoformat(),
                "confirmation_key": history.confirmation_key,
                "timestamp": history.timestamp.isoformat()
            })
            
        return jsonify(history_data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

### ✅ CAST A VOTE ###
@routes.route("/vote", methods=["POST"])
@jwt_required()
def vote():
    try:
        data = request.json
        if not all(k in data for k in ("election_id", "vote")):
            return jsonify({"message": "Missing vote details"}), 400

        internal_id = get_jwt_identity()
        election_id = data["election_id"]
        
        # Check if election exists and is active
        election = Election.query.get(election_id)
        if not election or election.status != "active":
            return jsonify({"message": "Invalid or inactive election"}), 400

        # Check if already voted
        if VoteValidation.query.filter_by(internal_id=internal_id, election_id=election_id).first():
            return jsonify({"message": "Already voted in this election"}), 400

        # Process vote
        hashed_vote = hashlib.sha256(data["vote"].encode()).hexdigest()
        confirmation_key = hashlib.sha256((hashed_vote + internal_id).encode()).hexdigest()

        # Save vote validation
        vote_validation = VoteValidation(
            internal_id=internal_id,
            election_id=election_id,
            hashed_vote=hashed_vote,
            confirmation_key=confirmation_key
        )
        db.session.add(vote_validation)

        # Save voting history
        voting_history = VotingHistory(
            voter_internal_id=internal_id,
            election_id=election_id,
            confirmation_key=confirmation_key,
            timestamp=datetime.utcnow()
        )
        db.session.add(voting_history)

        # Update public vote count
        candidate_vote = PublicVotes.query.filter_by(
            candidate=data["vote"],
            election_id=election_id
        ).first()
        
        if candidate_vote:
            candidate_vote.vote_count += 1
        else:
            new_vote = PublicVotes(
                candidate=data["vote"],
                vote_count=1,
                election_id=election_id
            )
            db.session.add(new_vote)

        db.session.commit()
        return jsonify({
            "message": "Vote cast successfully!",
            "confirmation_key": confirmation_key
        }), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

### ✅ VERIFY A VOTE ###
@routes.route("/verify_vote", methods=["POST"])
def verify_vote():
    try:
        data = request.json
        if not all(k in data for k in ("internal_id", "election_id")):
            return jsonify({"message": "Missing verification details"}), 400

        vote_record = VoteValidation.query.filter_by(
            internal_id=data["internal_id"],
            election_id=data["election_id"]
        ).first()
        
        if vote_record:
            return jsonify({
                "message": "Vote verified",
                "confirmation_key": vote_record.confirmation_key
            }), 200
        
        return jsonify({"message": "No vote found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

### ✅ GET ELECTION RESULTS ###
@routes.route("/election_results/<int:election_id>", methods=["GET"])
def get_election_results(election_id):
    try:
        election = Election.query.get(election_id)
        if not election:
            return jsonify({"message": "Election not found"}), 404

        results = PublicVotes.query.filter_by(election_id=election_id).all()
        return jsonify({
            "election_name": election.name,
            "status": election.status,
            "results": {vote.candidate: vote.vote_count for vote in results}
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
