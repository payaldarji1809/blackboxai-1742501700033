import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import "./style/Vote.css";

const Vote = () => {
  const [electionDetails, setElectionDetails] = useState(null);
  const [vote, setVote] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmationKey, setConfirmationKey] = useState(null);
  const navigate = useNavigate();
  const { electionId } = useParams();

  useEffect(() => {
    const token = localStorage.getItem("voter_token");
    if (!token) {
      navigate("/voter");
      return;
    }

    // Fetch election details
    const fetchElectionDetails = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const response = await axios.get(`http://127.0.0.1:5000/active_elections`, { headers });
        const election = response.data.find(e => e.id === parseInt(electionId));
        
        if (!election) {
          setError("Election not found or no longer active");
          setLoading(false);
          return;
        }

        if (election.has_voted) {
          setError("You have already voted in this election");
          setLoading(false);
          return;
        }

        setElectionDetails(election);
        setLoading(false);
      } catch (err) {
        setError("Failed to fetch election details");
        setLoading(false);
        console.error("Error fetching election:", err);
      }
    };

    fetchElectionDetails();
  }, [electionId, navigate]);

  const submitVote = async () => {
    if (!vote) {
      setError("Please select a candidate");
      return;
    }

    try {
      const token = localStorage.getItem("voter_token");
      const response = await axios.post(
        "http://127.0.0.1:5000/vote",
        {
          election_id: electionId,
          vote: vote
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setConfirmationKey(response.data.confirmation_key);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit vote");
      console.error("Voting error:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
          <div className="text-red-500 text-center mb-4">{error}</div>
          <button
            onClick={() => navigate("/voter-dashboard")}
            className="w-full bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (confirmationKey) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
          <div className="text-center">
            <div className="text-green-500 text-4xl mb-4">
              <i className="fas fa-check-circle"></i>
            </div>
            <h2 className="text-2xl font-bold mb-4">Vote Submitted Successfully!</h2>
            <p className="text-gray-600 mb-4">Your vote has been recorded securely.</p>
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <p className="text-sm text-gray-500 mb-2">Confirmation Key:</p>
              <p className="font-mono text-sm break-all">{confirmationKey}</p>
            </div>
            <button
              onClick={() => navigate("/voter-dashboard")}
              className="w-full bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="bg-blue-600 px-6 py-4">
            <h1 className="text-xl font-bold text-white">Cast Your Vote</h1>
          </div>

          <div className="p-6">
            {electionDetails && (
              <>
                <h2 className="text-lg font-semibold mb-4">{electionDetails.name}</h2>
                <p className="text-sm text-gray-500 mb-6">
                  Election ends: {new Date(electionDetails.end_date).toLocaleDateString()}
                </p>

                <div className="space-y-4 mb-6">
                  <label className="block text-sm font-medium text-gray-700">
                    Select your candidate:
                  </label>
                  <input
                    type="text"
                    placeholder="Enter candidate name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={vote}
                    onChange={(e) => setVote(e.target.value)}
                  />
                </div>

                <div className="flex justify-between">
                  <button
                    onClick={() => navigate("/voter-dashboard")}
                    className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitVote}
                    className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
                  >
                    Submit Vote
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Vote;
