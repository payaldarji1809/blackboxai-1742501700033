import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./style/VoterDashboard.css";

const VoterDashboard = () => {
  const [voterDetails, setVoterDetails] = useState(null);
  const [activeElections, setActiveElections] = useState([]);
  const [votingHistory, setVotingHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("voter_token");
    if (!token) {
      navigate("/voter");
      return;
    }

    const fetchData = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };

        // Fetch voter details
        const voterResponse = await axios.get("http://127.0.0.1:5000/voter_details", { headers });
        setVoterDetails(voterResponse.data);

        // Fetch active elections
        const electionsResponse = await axios.get("http://127.0.0.1:5000/active_elections", { headers });
        setActiveElections(electionsResponse.data);

        // Fetch voting history
        const historyResponse = await axios.get("http://127.0.0.1:5000/voting_history", { headers });
        setVotingHistory(historyResponse.data);

        setLoading(false);
      } catch (err) {
        setError("Failed to fetch dashboard data");
        setLoading(false);
        console.error("Dashboard error:", err);
      }
    };

    fetchData();
  }, [navigate]);

  const handleVote = (electionId) => {
    navigate(`/vote/${electionId}`);
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
        <div className="text-red-500 text-xl">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow-xl rounded-lg overflow-hidden">
          {/* Header */}
          <div className="bg-blue-600 px-6 py-4">
            <h1 className="text-2xl font-bold text-white">Voter Dashboard</h1>
          </div>

          {/* Voter Information */}
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold mb-4">Voter Information</h2>
            {voterDetails && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-600">Name</p>
                  <p className="font-medium">{`${voterDetails.first_name || ''} ${voterDetails.last_name || ''}`}</p>
                </div>
                <div>
                  <p className="text-gray-600">Email</p>
                  <p className="font-medium">{voterDetails.email || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-gray-600">Voter ID</p>
                  <p className="font-medium">{voterDetails.unique_token}</p>
                </div>
              </div>
            )}
          </div>

          {/* Active Elections */}
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold mb-4">Active Elections</h2>
            {activeElections.length > 0 ? (
              <div className="space-y-4">
                {activeElections.map((election) => (
                  <div key={election.id} className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-medium">{election.name}</h3>
                        <p className="text-sm text-gray-500">
                          Ends: {new Date(election.end_date).toLocaleDateString()}
                        </p>
                      </div>
                      {!election.has_voted ? (
                        <button
                          onClick={() => handleVote(election.id)}
                          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
                        >
                          Cast Vote
                        </button>
                      ) : (
                        <span className="text-green-500 font-medium">Vote Cast</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No active elections at the moment.</p>
            )}
          </div>

          {/* Voting History */}
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Voting History</h2>
            {votingHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Election
                      </th>
                      <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Confirmation Key
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {votingHistory.map((vote, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {vote.election_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {new Date(vote.election_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">
                          {vote.confirmation_key}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500">No voting history available.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoterDashboard;
