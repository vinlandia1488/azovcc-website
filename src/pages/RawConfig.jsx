import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

const RawConfig = () => {
  const { username } = useParams();
  const [content, setContent] = useState('Loading...');

  useEffect(() => {
    async function fetchConfig() {
      try {
        const response = await fetch(`/api/configs?username=${username}`);
        const text = await response.text();
        setContent(text);
      } catch (err) {
        setContent('[ERROR] Failed to load config');
      }
    }
    fetchConfig();
  }, [username]);

  // Set the background to black and text to white to match the raw feel
  useEffect(() => {
    document.body.style.backgroundColor = '#000000';
    document.body.style.margin = '0';
    document.body.style.padding = '20px';
    document.body.style.color = '#ffffff';
    document.body.style.fontFamily = 'monospace';
    document.body.style.whiteSpace = 'pre-wrap';
    return () => {
      document.body.style.backgroundColor = '';
      document.body.style.margin = '';
      document.body.style.padding = '';
      document.body.style.color = '';
      document.body.style.fontFamily = '';
      document.body.style.whiteSpace = '';
    };
  }, []);

  return <>{content}</>;
};

export default RawConfig;
