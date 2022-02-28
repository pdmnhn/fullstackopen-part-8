import { useQuery } from "@apollo/client";
import { useEffect, useState } from "react";
import { ALL_BOOKS } from "../queries";

const useBooks = () => {
  const result = useQuery(ALL_BOOKS);
  const [genres, setGenres] = useState([]);

  useEffect(() => {
    if (result.data) {
      setGenres(
        result.data.allBooks
          .reduce((array, book) => {
            return [...array, ...book.genres];
          }, [])
          .filter((genre, index, array) => array.indexOf(genre) === index)
      );
    }
  }, [result.data]);

  return { books: result.data?.allBooks, genres, loading: result.loading };
};

export default useBooks;
