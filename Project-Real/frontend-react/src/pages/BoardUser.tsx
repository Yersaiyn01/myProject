import { useState, useEffect } from 'react';
import { userService } from '../services/api';

export const BoardUser = () => {
  const [content, setContent] = useState<string>('');

  useEffect(() => {
    userService.getUserBoard()
      .then(response => {
        setContent(response.data);
      })
      .catch(error => {
        setContent(`Error: ${error.response?.data?.message || error.message}`);
      });
  }, []);

  return (
    <div className="board">
      <h1>User Board</h1>
      <div className="board-content">
        <p>{content}</p>
      </div>
    </div>
  );
};